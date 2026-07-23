# AI 客服重构设计：Advisors API + Function Call

- 日期：2026-07-23
- 状态：待评审
- 范围：Spec 1（后端 AI 重构 + 对话持久化写入侧）；Spec 2（Admin 对话记录浏览）另行设计

## 1. 背景与目标

现有智能客服（`ChatController`）手动组装消息列表、手动把 RAG 检索结果拼接进用户消息，没有使用 Spring AI 的 Advisors API，也没有 Function Call 能力。本次重构目标：

1. 用 **Advisors API**（Spring AI 2.0 的 `CallAdvisor` / `StreamAdvisor` / `BaseAdvisor`）组织对话增强逻辑：会话记忆、当前文章上下文、全站 RAG 检索注入、对话持久化
2. 用 **Function Call**（`@Tool`）暴露全套站点能力给模型：文章查询、项目列表、Skill 目录、联系方式登记
3. 对话记忆改为**服务端管理**：Redis 缓存（模型上下文窗口），MySQL 持久化完整问答流水（含 IP / 设备 / 时间元数据），为 Spec 2 的 Admin 对话记录页提供数据

### 非目标（本次不做）

- Admin 对话记录的查询 API 与前端页面（Spec 2）
- 对话的管理操作（删除 / 导出）、工具调用明细落库
- 前端 UI 大改（仅适配 conversationId 契约）

## 2. 总体架构

```
Frontend ChatProvider
  POST /api/v1/ai/chat  { message, conversationId?, articleId? }   ← history 字段弃用
        │
Next.js route.ts（透传 body；回传 X-Conversation-Id 响应头）
        │
ChatController（瘦控制器：参数校验 + IP/UA 元数据捕获 + conversationId 生成）
        │
ChatClient.prompt().user(message).advisors(params…).stream().content()
        │
┌─────────── Advisor 链（order 小 → 在外层先执行）────────────┐
│ order   0  ConversationPersistenceAdvisor  会话落库 + 元数据  │
│ order  50  SimpleLoggerAdvisor（官方内置）  请求/响应日志     │
│ order 100  MessageChatMemoryAdvisor（官方） 读/写 Redis 记忆  │
│ order 200  ArticleRetrievalAdvisor         注入 RAG 相关文章  │
│ order 300  ArticleContextAdvisor           注入当前文章全文   │
└──────────────────────────────────────────────────────────────┘
        ▼
DeepSeek chat model  ⇄  @Tool 调用循环
  （ArticleTools / ProjectTools / SkillTools / ContactTools）
```

### 2.1 顺序即语义

- `MessageChatMemoryAdvisor` 必须在 RAG / 文章上下文 Advisor **外层**：它保存的是执行到它时的用户消息，即**原始问题**，而非被检索区块膨胀后的消息。避免多轮对话中注入文本在记忆里无限累积。
- `ConversationPersistenceAdvisor` 在最外层同理：审计只记录「原始问题 + 最终回答」，不记录注入的检索区块与工具调用中间过程。

### 2.2 记忆与审计分离

- **Redis 记忆线**：窗口化（`MessageWindowChatMemory`，默认 20 条），可丢失、可淘汰，只为模型上下文服务
- **MySQL 审计线**：完整问答流水，永不窗口化，供 Spec 2 Admin 页面使用

两条线独立，互不影响。

## 3. Advisor 链详细设计

### 3.1 ConversationPersistenceAdvisor（自定义，StreamAdvisor，order 0）

职责：会话元数据 + 完整问答落库。

- `before`：从 advisor 参数读取 `conversationId` / `ip` / `userAgent`；异步 upsert `ai_chat_session`（不存在则 insert 含元数据，存在则更新 `last_active_at`）；保存原始用户问题文本
- 对下游返回的 `Flux<ChatResponse>`：`doOnNext` 累积 assistant 全文 → `doOnComplete` 异步写入 user 消息行 + assistant 消息行，`message_count += 2`
- 客户端中途断开（`doOnCancel`）：写 user 消息行、不写 assistant 行；`message_count` 为奇数即中断会话，Spec 2 可辨识
- 所有 DB 写入走专用线程池（`ai-persistence`，固定 2 线程），失败仅记 warn 日志，绝不向流抛异常

### 3.2 SimpleLoggerAdvisor（官方内置，order 50）

请求 / 响应调试日志，开发期可观测性。

### 3.3 会话记忆（官方 MessageChatMemoryAdvisor，order 100）

- `ChatMemory` = `MessageWindowChatMemory`（窗口 20 条，可配置）+ **自定义 `SpringRedisChatMemoryRepository`**（实现官方 `ChatMemoryRepository` 接口，基于项目现有 `StringRedisTemplate`，复用 `spring.data.redis` 连接配置含密码）；消息转 JSON 存 Redis List，TTL 通过 `EXPIRE` 实现
- **不用官方 Redis starter 的原因**：官方 `RedisChatMemoryRepository` 依赖 RediSearch 搜索索引模块，且自动配置只支持 host/port、不支持密码，与本项目 `redis:7-alpine` + `requirepass` 部署不兼容
- conversationId 通过 `ChatMemory.CONVERSATION_ID` advisor 参数传入
- Redis TTL：默认 7 天（若 starter 支持 TTL 配置则用之，否则调度器清理过期 key，实现阶段确认）
- 外包 `ResilientChatMemory` 装饰器（delegate 模式）：读失败返回空历史、写失败仅记日志，保证 Redis 故障时聊天降级可用

### 3.4 ArticleContextAdvisor（自定义，order 300，最内层）

复用现有 `ArticleContextService.buildArticleContext(articleId)`，把「当前文章」全文区块注入用户消息。articleId 经 advisor 参数传入；加载失败返回空区块（沿用现有降级行为）。order 300 最后执行 before()，其区块前置到最靠近…实际效果见 3.5 的顺序说明。

### 3.5 ArticleRetrievalAdvisor（自定义，order 200）

把现有 `ChatController.buildRagBlock` 逻辑迁入：

- 调 `ArticleVectorService.search(query, 4)`，剔除当前文章（advisor 参数 `articleId`）后保留前 3 条（参数迁至配置 `sean.ai.chat.rag.*`）
- **新增**：按检索结果的 ID 列表批量查 DB 补 slug，注入区块每条附带 slug（供模型后续调用 `getArticleBySlug` 工具取全文）
- 检索失败 catch 后返回未修改的请求（降级为纯聊天，沿用现有行为）

**区块顺序说明**：两个 advisor 都以「前置」方式增强用户消息，before() 按 order 200（RAG）→ 300（当前文章）执行，后执行的区块前置到更靠前的位置，最终文本顺序为 `[当前文章区块][相关文章区块][用户问题]`，与重构前 `buildAugmentedMessage` 的顺序一致。

## 4. 对话持久化数据模型

Flyway 脚本 `V8__ai_chat_session_message.sql`，ID 复用现有 `SnowflakeIdGenerator`，不建物理外键（沿用项目惯例）：

```sql
CREATE TABLE ai_chat_session (
  id               BIGINT       NOT NULL PRIMARY KEY,   -- snowflake
  conversation_id  VARCHAR(36)  NOT NULL,               -- UUID，对外暴露的会话标识
  created_at       DATETIME     NOT NULL,               -- 首次提问时间
  last_active_at   DATETIME     NOT NULL,               -- 最近问答时间
  ip               VARCHAR(64),                        -- X-Forwarded-For 优先，否则 RemoteAddr
  user_agent       VARCHAR(512),                       -- 设备标识（浏览器/OS 解析留给 Admin 端）
  message_count    INT          NOT NULL DEFAULT 0,     -- 消息数（user+assistant）
  UNIQUE KEY uk_conversation_id (conversation_id)
);

CREATE TABLE ai_chat_message (
  id          BIGINT       NOT NULL PRIMARY KEY,        -- snowflake
  session_id  BIGINT       NOT NULL,                    -- 逻辑关联 ai_chat_session.id
  role        VARCHAR(16)  NOT NULL,                    -- user / assistant
  content     MEDIUMTEXT   NOT NULL,                    -- 原始问题 / 最终回答全文
  created_at  DATETIME     NOT NULL,
  KEY idx_session_created (session_id, created_at)
);
```

工具调用中间过程不落 `ai_chat_message`（v1 只记两端问答，工具细节看日志）。

## 5. Function Call 工具设计

四个工具类，`ChatClient` 经 `defaultTools(...)` 统一注册。通用约束：返回值统一截断防上下文爆炸；内部异常不外抛，返回描述性失败字符串由模型应对。

| 工具类 | 方法 | 行为 |
|--------|------|------|
| `ArticleTools` | `getArticleBySlug(slug)` | 查文章全文（走 `ArticleMapper.findBySlug` 并校验 status 为已发布，**不计浏览数**；正文截断 8000 字符） |
| | `listRecentArticles(count)` | 按发布时间倒序取最近 N 篇已发布文章的 slug / 标题 / 摘要 / 日期（默认 5，上限 10） |
| `ProjectTools` | `listProjects()` | 已发布项目列表（标题 / 描述 / 技术栈 / 链接） |
| `SkillTools` | `listSkillBundles()` | 已发布 Skill Bundle 列表（名称 / 描述 / 类型） |
| | `getSkillFileTree(bundleId)` | 指定 Bundle 文件树（复用 `FileBundleService.getTree`） |
| | `readSkillFile(bundleId, path)` | 文件内容（截断 10000 字符，复用 `FileBundleService.getFileContent`） |
| `ContactTools` | `requestResume(email, companyName)` | 登记简历请求 → `ContactService` |
| | `subscribeEmail(email)` | 登记订阅 → `ContactService` |

实现要点：

- `ContactService.record*` 现依赖 `HttpServletRequest` 取 IP；为其新增**不依赖 request 的重载**，IP 由 Controller 捕获的会话 IP 传入
- `system-prompt.md` 补充工具规范：写类工具（简历请求 / 订阅）必须在用户明确给出邮箱且格式合法后才调用

## 6. API 契约变更

### 请求

```jsonc
POST /api/v1/ai/chat
{ "message": "…", "conversationId": "uuid（可选，首次不传）", "articleId": 123 }
```

- `history` 字段**删除**（记忆服务端管理）；`ChatHistorySanitizer` 及其测试随之删除（实现阶段确认无其他引用）
- 后端不信任 `conversationId` 格式：非 UUID 形式则视为新会话重新生成

### 响应

- SSE 流不变（`text/event-stream`，纯文本 chunk）
- **新增响应头** `X-Conversation-Id`：每次响应都带回当前会话 ID

### Controller 形态

```java
chatClient.prompt()
    .user(message)
    .advisors(a -> a
        .param(ChatMemory.CONVERSATION_ID, conversationId)
        .param("articleId", articleId)
        .param("ip", ip).param("userAgent", ua))
    .stream().content();
```

IP / UA 在 Controller 从 `HttpServletRequest` 捕获（`X-Forwarded-For` 优先），经 advisor 参数传递——工具层与 advisor 层不依赖 Web 层。

`ChatClient` 统一配置收敛到新 `AiConfig`：`defaultSystem(systemPrompt)` + `defaultAdvisors(persistence, logger, memory, articleContext, rag)` + `defaultTools(...)`。ChatController 中 `buildAugmentedMessage` / `buildRagBlock` 全部删除。

## 7. 前端变更

1. **`route.ts`**：响应 headers 透传后端的 `X-Conversation-Id`
2. **`ChatProvider`**：
   - 新增 `conversationId` 状态，持久化到 `sessionStorage`（同标签页多轮连续，跨标签页独立会话）
   - 首次响应后从 `response.headers` 读取并存储
   - 请求体携带 `conversationId`，**不再发送 `history`**（本地 messages state 保留，仅用于 UI 渲染）
   - 「新对话」入口：清空 conversationId + 消息列表（若现有 UI 无清空按钮则补一个）

## 8. 配置与依赖变更

- `pom.xml`：**无新增依赖**（自定义 Redis 记忆仓库复用现有 `spring-boot-starter-data-redis`）
- `application.yml` 新增：

```yaml
sean:
  ai:
    chat:
      memory-window: 20        # 模型上下文窗口（条）
      memory-ttl-days: 7       # Redis 记忆 TTL
      rag:
        fetch-size: 4          # 向量检索取数
        keep-size: 3           # 注入上限
```

- Flyway：`V8__ai_chat_session_message.sql`
- `system-prompt.md`：补充工具使用规范段落

## 9. 错误处理与降级矩阵

原则：任何辅助链路故障都降级为纯聊天，绝不中断对话。

| 故障点 | 处理 |
|--------|------|
| Redis 不可用 | `ResilientChatMemory` 读返回空历史、写仅记日志；本轮无记忆但正常对话 |
| 会话落库失败 | 异步写 + warn 日志，不影响 SSE |
| 向量检索失败 | advisor 内 catch，返回未修改请求（降级纯聊天） |
| 当前文章加载失败 | 返回空区块（沿用 `ArticleContextService` 现有行为） |
| 工具执行失败 | 工具内 catch 返回失败描述字符串，模型向用户说明 |
| 客户端中途断开 | 写 user 行不写 assistant 行；`message_count` 奇数即中断 |

## 10. 测试与验收

### 单元测试

- `ConversationPersistenceAdvisor`：mock AdvisorChain，验证 session upsert、消息行写入、流中断行为
- 各 Tools 类：mock Service，验证截断与异常降级返回
- `ResilientChatMemory`：mock 底层抛异常，验证读写降级
- `ArticleRetrievalAdvisor`：验证剔除当前文章、slug 补齐、失败降级

### 手工验收清单

1. 连续问 3 轮 → 第 3 轮能引用第 1 轮内容（记忆生效）
2. 换浏览器标签页 → 会话独立
3. 停 Redis → 聊天正常、无记忆、日志有 warn
4. 问「你有哪些项目」「帮我订阅 a@b.com」→ 触发对应工具调用
5. 查 `ai_chat_session` / `ai_chat_message` → IP、UA、时间、完整问答齐全
6. 文章详情页提问 → 回答基于当前文章内容；问「相关文章」能给出带链接的引用

## 11. 风险与备注

- **流式 + 工具调用**：Spring AI 2.0 的 `stream()` 理论上自动处理工具调用循环（内部执行工具后续答）。DeepSeek 经 OpenAI 兼容接口支持 function calling。集成阶段需实测首字延迟与循环行为；若有问题，退路为该请求改用非流式工具阶段或显式 `ToolCallingChatOptions`
- **Redis 记忆序列化**：自定义仓库用自有 DTO（`StoredMessage(type, text)`）转 JSON，绕开 Spring AI Message 对象不可直接序列化的问题；仅存文本与类型（记忆窗口内无需 tool call 中间态）
- **记忆窗口与注入体积**：当前文章全文注入（≤30000 字符）+ RAG 区块 + 20 条窗口，极端情况下单请求 token 较大；窗口与截断参数均已配置化，上线后可调
- 删除 `history` 字段与 `ChatHistorySanitizer` 要求前后端同批发布（本项目 Docker Compose 统一部署，满足）
