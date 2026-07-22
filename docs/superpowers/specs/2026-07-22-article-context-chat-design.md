# 文章上下文感知的 AI 助手 — 设计文档

- **日期**：2026-07-22
- **状态**：待实现
- **前置文档**：`2026-07-22-ai-chat-widget-design.md`（现有全局 AI 聊天组件）

## 背景

项目已有完整的 AI 助手：后端 `ChatController`（SSE 流式 + Lucene 向量 RAG）、前端浮动聊天组件（`ChatWidget` / `ChatProvider`）。但聊天接口是无状态单轮的，只接收 `message` 参数——**后端无法知道用户正在阅读哪篇文章**。

用户在文章详情页问「这篇文章讲了什么」时，向量检索只会按这句话做语义匹配，召回的内容与当前文章无关，答非所问。

## 目标

在文章详情页（`/blog/[id]`）打开 AI 助手时，自动感知当前文章：

1. 用户问「这篇文章讲了什么」「本文的第三部分是什么意思」等问题，AI 基于当前文章全文回答
2. 多轮追问（「展开讲讲」「再详细点」）能正确理解指代
3. 助手**感知文章但不受限**——在文章页问其他问题（通用技术问题、全站 RAG）行为不变
4. 上下文对用户可见：面板显示当前文章 chip + 文章版欢迎语
5. 切换到另一篇文章时对话保留，上下文自动跟随新文章

## 非目标（v1 范围外）

- 服务端会话存储（后端保持无状态）
- 按文章过滤的向量检索（全文注入已覆盖需求）
- 聊天历史持久化（刷新页面即清空，维持现状）
- 非文章页面（项目页、关于我页）的上下文感知

## 已确认的关键决策

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 上下文注入方式 | **全文注入** | 个人博客文章几千字（~3-5k tokens），DeepSeek 上下文充裕、成本低；对「总结全文」类问题最准，实现最简 |
| 助手范围 | **感知但不受限** | 文章页问其他问题仍正常回答，体验不降级 |
| 多轮记忆 | **前端带上历史，接口改 POST** | 后端保持无状态；顺带解决 GET 长 URL 被 Nginx 截断的隐患 |
| UI | **上下文可见 + 切换文章保留对话** | 用户知道 AI 已感知文章，才会主动问「这篇文章讲了什么」 |
| 上下文传递 | **前端传 articleId，后端加载全文** | 服务端可信来源、可校验已发布、请求体小、客户端无法伪造文章内容 |

## 架构与数据流

```
┌───────────────────────────── 前端 ─────────────────────────────┐
│  /blog/[id] 文章详情页（'use client'，已有完整 article 对象）    │
│    │ ① 文章加载完成后 setArticleContext({id, title})             │
│    ▼                                                            │
│  ChatProvider（全局，layout 层，已有）                           │
│    新增 state: articleContext {id,title} | null                  │
│    已有 state: messages[]                                        │
│    │ ② 发消息：POST ${BACKEND}/ai/chat                           │
│    │    body: { message, articleId?, history: [{role,content}] } │
│    ▼                                                            │
│  SSE 流 ← 逐 chunk 拼接（现有读取逻辑不变）                      │
│                                                                 │
│  ChatPanel 头部：上下文 chip「📖 《文章标题》」                  │
│  欢迎语：文章页变为"你正在阅读《xxx》，可以问关于这篇文章的问题" │
└─────────────────────────────────────────────────────────────────┘
                            │ HTTP POST，响应仍是 SSE
                            ▼
┌───────────────────────────── 后端 ─────────────────────────────┐
│  ChatController.chat(ChatRequest)                               │
│    ③ articleId 存在 → ArticleContextService                     │
│       → 加载已发布文章全文（超 30k 字符截断）→「当前文章」区块   │
│       未找到/未发布/异常 → 跳过该区块（log.warn，正常回答）      │
│    ④ 全局 RAG：articleVectorService.search(message, 4)          │
│       → 剔除当前 articleId → 取前 3 →「相关文章」区块（保留）    │
│    ⑤ Prompt 组装：                                              │
│       system（扩充：当前文章区块使用说明）                       │
│       + history（最近对话，user/assistant 成对）                 │
│       + user（[当前文章区块] + [相关文章区块] + 用户问题）        │
│    ⑥ chatClient.stream() → Flux<String> SSE（不变）             │
└─────────────────────────────────────────────────────────────────┘
```

## 后端设计

### 请求 DTO（新增 `module/ai/dto/`）

```java
public record ChatRequest(
    String message,                 // 必填，非空
    Long articleId,                 // 可选：用户正在阅读的文章 ID
    List<ChatMessageDto> history    // 可选：最近对话记录
) {}

public record ChatMessageDto(String role, String content) {}
```

### ChatController 改造

- 路由：`GET /chat?message=` → `POST /chat`（`@RequestBody ChatRequest`），`produces = text/event-stream` 不变
- 前端是唯一消费者，直接替换，不保留旧 GET 接口
- `message` 为空/空白 → 返回 400
- Prompt 组装改用显式消息列表：

```java
List<Message> messages = new ArrayList<>();
messages.add(new SystemMessage(systemPrompt));
for (ChatMessageDto h : sanitizedHistory) {
    messages.add("assistant".equals(h.role())
        ? new AssistantMessage(h.content())
        : new UserMessage(h.content()));
}
messages.add(new UserMessage(augmentedUserMessage));
return chatClient.prompt().messages(messages).stream().content();
```

### 历史消息后端兜底校验（不完全信任前端）

抽成纯函数便于单测：

- `role` 只认 `user` / `assistant`，其余条目丢弃
- 只取最近 **10 条**
- 单条 `content` 截断至 **4000** 字符，总长 ≤ **8000** 字符（超长从最旧丢弃）
- `history` 为 null 或空 → 视为无历史

### ArticleContextService（新增 `module/ai/service/`）

让 Controller 保持薄，文章上下文的加载与格式化独立成单元：

```java
public Optional<String> buildArticleContext(Long articleId)
```

行为：

- `articleId` 为 null 或 ≤ 0 → `Optional.empty()`
- 通过 `ArticleService.findPublishedById(id)`（**新增，无浏览量副作用**）加载文章
- 文章不存在 / 未发布 → `Optional.empty()` + `log.warn`
- 正文取值：`contentMd` 优先；为空则退回 `excerpt`；都为空 → `Optional.empty()`
- 正文超过 **30000 字符** → 截断并在末尾追加 `\n…（内容过长已截断）`
- 任何异常 → `Optional.empty()` + `log.warn`（绝不阻断聊天）

输出区块格式：

```
---当前文章---
《{title}》
{contentMd}
---当前文章结束---
```

### 关键坑：浏览次数副作用

现有 `ArticleService.getPublishedById()` 会自动 +1 浏览量。AI 内部加载文章**不能**计入浏览，否则用户每问一次浏览量就涨一次。

→ 在 `ArticleService` + Mapper 新增 `findPublishedById(Long id)`：只查询 `status = PUBLISHED` 的文章，不做任何 UPDATE。AI 模块专用此方法。

### RAG 去重

`articleVectorService.search(message, 4)`：topK 从 3 提到 4，在 Controller 中剔除 `SearchResult.id() == String.valueOf(articleId)` 的条目后取前 3——避免当前文章同时出现在「当前文章」和「相关文章」两个区块里。

### 增强后的用户消息格式

```
---当前文章---            ← 仅 articleId 有效时存在
《{title}》
{contentMd}
---当前文章结束---

以下是全站检索到的与问题相关的博客文章，请参考：   ← 仅 RAG 有结果时存在
---相关文章---
### 《t1》
c1
---文章结束---

用户问题：{message}
```

两个区块都不存在时（非文章页 + RAG 无结果），用户消息保持原样，与现有行为一致。

### system-prompt.md 扩充

在现有「如何使用相关文章」一节附近新增：

```markdown
## 如何使用「当前文章」
用户消息中可能包含「---当前文章---」区块，这是访客正在阅读的文章全文。
- 当用户提到"这篇文章"、"本文"、"这篇"、"当前文章"等指代词时，指的就是区块中的文章，即使对话历史里出现过其他文章
- 回答关于当前文章的问题时，基于区块内的全文内容进行总结、解读和延伸
- 「当前文章」与「相关文章」同时存在时，涉及"这篇/本文"的问题优先使用当前文章区块
- 用户的问题与当前文章无关时，正常回答即可，不必强行关联
```

## 前端设计

### ChatProvider 改造（`components/chat/ChatProvider.tsx`）

新增状态与 API（`id` 为 `string`——前端 `Article.id` 是 string，Long 精度由后端以字符串返回）：

```ts
articleContext: { id: string; title: string } | null
setArticleContext: (ctx: { id: string; title: string } | null) => void
```

请求体中的 `articleId` 因此是 JSON 字符串（如 `"123"`），Jackson 默认能将数字字符串绑定到后端的 `Long articleId`。

**欢迎语**：常量 `WELCOME_MESSAGE` 改为函数 `buildWelcomeMessage(articleContext)`：

- `null` → 现有通用欢迎语（内容不变）
- 有值 → `📖 你正在阅读《{title}》，可以问我任何关于这篇文章的问题，比如「这篇文章讲了什么？」`

`closeChat` 重置消息时同样使用 `buildWelcomeMessage(articleContext)`，保证文章页关掉面板再打开仍显示文章版欢迎语。`articleContext` 生命周期由文章页拥有，`closeChat` 不清除它。

**欢迎语联动**：`useEffect` 监听 `articleContext` 变化——若当前 `messages` 只剩欢迎语（无真实对话），替换为新版欢迎语；已有对话则不动（chip 已传达上下文）。

**发送改 POST**：

```ts
const history = messages          // 发送前快照（不含本次新增消息）
  .filter((m) => m.id !== 'welcome')
  .slice(-10)
  .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: trimmed,
    articleId: articleContext?.id ?? null,
    history,
  }),
  signal: controller.signal,
});
```

URL 构造逻辑不变（`NEXT_PUBLIC_BACKEND_URL` 直连后端，无则走 `/api/v1/ai/chat`）。SSE 读取逻辑（`reader.read()` 逐 chunk 拼接）完全不变。`articleId` 在 `sendMessage` 调用时快照捕获，保证问题与上下文一致。

### 文章详情页接线（`app/blog/[id]/page.tsx`）

```tsx
const { setArticleContext } = useChat();

useEffect(() => {
  if (article) {
    setArticleContext({ id: article.id, title: article.title });
  }
  return () => setArticleContext(null);   // 离开文章页 → 清除上下文
}, [article?.id]);
```

- 切换到另一篇文章（前置/下一篇文章链接）：effect 重跑 → 上下文跟随新文章，对话保留
- 离开文章页（回首页等）：cleanup 清除 → 全局模式

### ChatPanel 上下文 chip

头部标题下方新增一行（仅 `articleContext` 存在时渲染）：

- 内容：`📖 《{title}》`，超长 `text-overflow: ellipsis`，`title` 属性显示完整标题
- 样式：遵循 DESIGN.md——`1px solid #E2E8F0` 边框、Green `#0a6c44` 文字、小字号
- 点击：`<a href={/blog/${id}}>`（当前页即该文章时无副作用）

### ChatInput 占位符

`articleContext` 存在时，placeholder 从默认文案变为「问问关于这篇文章的问题…」。

## 边界情况

所有异常路径遵循「降级不中断」原则：

| 边界情况 | 处理 |
|----------|------|
| articleId 指定但文章不存在 / 未发布 / 已软删除 | 跳过当前文章区块，log.warn，聊天正常进行 |
| contentMd 与 excerpt 均为空 | 同上 |
| 文章超过 30000 字符 | 截断并追加「…（内容过长已截断）」标记 |
| 客户端发来非法 history（role 非法、过长、过多） | 后端白名单 + 限额兜底 |
| message 为空 | 返回 400 |
| 文章上下文加载异常 / RAG 异常 | 各自 catch，退回纯聊天（现有 RAG fallback 不变） |
| 发消息与切换文章同时发生 | `articleId` 在 `sendMessage` 调用时快照捕获，保证一致 |
| 历史中有旧文章问答、当前在新文章 | system prompt 明确「当前文章」始终以最新区块为准 |
| Nginx POST SSE | SSE 缓冲配置按 location 生效（现有 GET SSE 已工作），同一 location 下 POST 无需额外配置，E2E 验证 |

## 验证方案

### 单元测试

- `ArticleContextService`：截断逻辑、excerpt 回退、未发布/不存在 → `Optional.empty()`
- 历史消息净化纯函数：role 白名单、条数与长度上限、null/空输入

### E2E 手动验证（docker compose 或本地 dev）

1. 打开某篇文章 → 面板显示文章版欢迎语 + 头部 chip
2. 问「这篇文章讲了什么」→ 正确总结**当前**文章（用两篇不同文章分别验证）
3. 追问「展开讲讲第三部分」→ 指代解析正确，回答衔接上文
4. 点前置/下一篇文章链接切到另一篇 → chip 更新、对话保留；再问「这篇文章讲了什么」→ 指向新文章
5. 回首页 → chip 消失、欢迎语恢复通用版，全局聊天与 RAG 行为不变
6. `curl -X POST` 传不存在的 articleId → 正常回答，无 500

### 构建验证

- 后端：`cd backend && mvn clean compile`
- 前端：`cd frontend && npm run build`

## 涉及文件清单

| 文件 | 变更 |
|------|------|
| `backend/.../module/ai/dto/ChatRequest.java` | 新增（含 `ChatMessageDto`） |
| `backend/.../module/ai/controller/ChatController.java` | 改造：GET→POST、history、文章区块、RAG 去重 |
| `backend/.../module/ai/service/ArticleContextService.java` | 新增 |
| `backend/.../module/blog/service/ArticleService.java` + Mapper/XML | 新增 `findPublishedById`（无浏览量副作用） |
| `backend/.../resources/prompt/system-prompt.md` | 扩充「当前文章」使用说明 |
| `frontend/src/components/chat/ChatProvider.tsx` | 核心改造：articleContext 状态、POST、history、欢迎语函数 |
| `frontend/src/components/chat/ChatPanel.tsx` | 头部上下文 chip |
| `frontend/src/components/chat/ChatInput.tsx` | 动态 placeholder |
| `frontend/src/app/blog/[id]/page.tsx` | 接线 `setArticleContext` effect |
