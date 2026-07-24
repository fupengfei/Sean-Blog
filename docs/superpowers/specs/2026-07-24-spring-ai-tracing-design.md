# Spring AI 链路追踪设计

**日期**：2026-07-24  
**状态**：已确认  
**方案**：Micrometer Tracing + OpenTelemetry + Zipkin（方案一）

---

## 1. 动机

当前 Spring AI 聊天链路涉及多个外部依赖（DeepSeek API、Qwen Embedding API、Redis、MySQL）和多层 Advisor 处理（RAG 检索、查询重写、会话持久化），但没有任何可观测性手段。出现性能问题或异常时，无法回答：

- 哪个环节最慢？
- LLM 调用和 RAG 检索各占多少时间？
- 某次工具调用是否成功？耗时多少？
- 同一会话的多轮请求之间关联关系是什么？

**目标**：为每条聊天请求建立分布式 trace，覆盖所有外部调用和内部处理环节，可通过 Zipkin UI 可视化排查。

---

## 2. 依赖与基础设施

### 2.1 Maven 新增依赖 (`pom.xml`)

```xml
<!-- Micrometer Tracing → OpenTelemetry 桥接 -->
<dependency>
    <groupId>io.micrometer</groupId>
    <artifactId>micrometer-tracing-bridge-otel</artifactId>
</dependency>

<!-- Zipkin 导出器（Brave 协议 → Zipkin） -->
<dependency>
    <groupId>io.opentelemetry</groupId>
    <artifactId>opentelemetry-exporter-zipkin</artifactId>
</dependency>
```

> **选型说明**：`micrometer-tracing-bridge-otel` 将 Micrometer Observation API 桥接到 OpenTelemetry 的 Tracer/Span。`opentelemetry-exporter-zipkin` 将 span 通过 Zipkin v2 API 上报。选择 Zipkin 而非 OTLP 是因为部署更轻量（一个容器），且与 Zipkin Brave 协议兼容通用 UI。

### 2.2 应用配置 (`application.yml`)

```yaml
management:
  tracing:
    sampling:
      probability: 1.0              # 全量采样（小流量场景）
  zipkin:
    tracing:
      endpoint: ${ZIPKIN_ENDPOINT:http://localhost:9411/api/v2/spans}

logging:
  level:
    '[io.micrometer.tracing]': INFO   # 抑制 tracer 内部 debug 日志
    '[io.opentelemetry]': INFO
```

### 2.3 Docker Compose (`docker-compose.yml`)

新增 Zipkin 服务：

```yaml
zipkin:
  image: openzipkin/zipkin:3
  ports:
    - "9411:9411"
  environment:
    - JAVA_OPTS=-Xmx256m
  restart: unless-stopped
```

### 2.4 自动覆盖

引入上述依赖后，Micrometer 自动为以下组件创建 span（零代码）：

| 组件 | 自动覆盖 | 说明 |
|------|---------|------|
| Spring MVC | HTTP 请求 → Controller | `POST /api/v1/ai/chat` 自动有 span |
| Redis（Lettuce） | 所有 Redis 命令 | 聊天记忆读写自动有 span |
| JDBC / MyBatis | SQL 执行 | 会话持久化、文章查询自动有 span |
| Spring AI ChatClient | LLM 调用 | 如果 Spring AI 2.0.0 内置 Observation 支持则自动覆盖；否则 Advisor 手动补充 |

---

## 3. Span 树设计

一次完整聊天请求的 span 树：

```
POST /api/v1/ai/chat (HTTP Server Span，框架自动)
└── chat-request (AiTracingAdvisor，Advisor 链最外层观测)
    ├── persistence:user-turn (ConversationPersistenceAdvisor before)
    ├── chat-memory:load (MessageChatMemoryAdvisor → Redis)
    ├── article-retrieval (ArticleRetrievalAdvisor)
    │   ├── query-rewrite:llm (QueryRewriter → DeepSeek API)
    │   ├── embedding:search (ArticleVectorService → Qwen API)
    │   └── lucene:search (LuceneVectorService → 本地磁盘)
    ├── article-context:load (ArticleContextAdvisor → 文件系统)
    ├── chat:llm (ChatClient → DeepSeek API，主 LLM 调用)
    │   ├── tool:getArticleBySlug (工具调用)
    │   ├── tool:listRecentArticles
    │   └── tool:listProjects
    └── persistence:assistant-turn (ConversationPersistenceAdvisor after)
```

**嵌套关系**：根 span `chat-request` 下，所有 Advisor 和外部调用均为子 span。同一 trace 的不同轮次通过 `conversation.id` tag 关联。

---

## 4. 实现组件

### 4.1 新增文件

#### 4.1.1 `AiTracingAdvisor.java`

位置：`com.sean.blog.module.ai.tracing`

职责：
- Advisor 链**最外层**（order = -1000），包裹所有其他 Advisor 和 LLM 调用
- `before()`：创建 Observation `"chat-request"`，注入 trace context 到 Advisor params
- `after()`：记录 token 用量、工具调用次数，stop Observation
- 异常安全：`before()` / `after()` 中任何异常仅 log warning，不打断链

核心字段：
```java
public static final String OBSERVATION_KEY = "tracingObservation";
public static final String START_NANOS_KEY = "tracingStartNanos";

// tags
public static final String TAG_CONVERSATION_ID = "conversation.id";
public static final String TAG_MODEL = "ai.model";
public static final String TAG_MESSAGE_LENGTH = "user.message_length";
public static final String TAG_ADVISORS_COUNT = "advisors.count";
public static final String TAG_TOTAL_DURATION_MS = "total.duration_ms";
```

#### 4.1.2 `AiObservationConvention.java`

位置：`com.sean.blog.module.ai.tracing`

职责：
- 实现 `ObservationConvention<Observation.Context>`，统一管理 span 命名规范
- 规范 KeyValue：所有 tag key 集中定义，避免手动 String 散落
- 规范 span 名称：`chat-request`、`chat:llm`、`tool:*`、`query-rewrite:llm`、`embedding:search`、`lucene:search`

#### 4.1.3 `AiTracingConfig.java`

位置：`com.sean.blog.module.ai.tracing`

职责：
- 注册 `AiTracingAdvisor` bean
- 注册 `AiObservationConvention` bean
- 注册 `ObservationRegistry`（Spring Boot 自动配置已有，此处仅做 convention 绑定）

### 4.2 改动文件

#### 4.2.1 `AiConfig.java`

- 注入 `AiTracingAdvisor`
- 在 `.defaultAdvisors()` 列表首位加入 `aiTracingAdvisor`（before 所有其他 advisor）

#### 4.2.2 `QueryRewriter.java`

- `rewrite()` 方法内包一层 `Observation.createNotStarted("query-rewrite:llm", registry)`
- tags：`query.original_length`、`query.rewritten_length`、`conversation.history_count`
- 异常时 span 标记 error

#### 4.2.3 `ArticleVectorService.java`

- `search()` 方法内包 Observation `"embedding:search"`
- `embed()` 方法内包 Observation `"embedding:encode"` 或复用 search 内层
- tags：`embedding.model`、`embedding.dimension`、`lucene.top_k`、`lucene.doc_count`

#### 4.2.4 `pom.xml` / `application.yml` / `docker-compose.yml`

见第 2 节。

---

## 5. Tag 约定

### 5.1 低基数（low cardinality）tag → 用于过滤和分组

| Tag Key | 示例值 | 说明 |
|---------|--------|------|
| `conversation.id` | `a1b2c3d4-...` | 会话 UUID |
| `ai.model` | `deepseek-v4-pro` | LLM 模型名 |
| `embedding.model` | `qwen3.7-text-embedding` | Embedding 模型名 |
| `tool.name` | `getArticleBySlug` | 工具名称 |
| `lucene.top_k` | `4` | 向量检索返回数 |

### 5.2 高基数（high cardinality）tag → 用于单次排查

| Tag Key | 示例值 | 说明 |
|---------|--------|------|
| `user.message_length` | `256` | 用户消息字符数 |
| `query.original_length` | `45` | 改写前查询长度 |
| `query.rewritten_length` | `128` | 改写后查询长度 |
| `tool.result_length` | `3200` | 工具返回内容字符数 |
| `total.duration_ms` | `2340` | 从用户请求到响应完成总耗时 |
| `error` | `true` / absent | span 是否异常 |
| `finish.reason` | `stop` / `tool_calls` | LLM 响应结束原因 |

---

## 6. 异常处理与降级策略

链路追踪绝对不能影响主业务：

1. **Observation 创建失败** → 跳过，不阻塞链
2. **Span 导出失败**（Zipkin 不可达）→ Micrometer 内部丢弃，不影响请求
3. **Advisor before/after 异常** → 仅 log warning，传递原始 request/response
4. **QueryRewriter / ArticleVectorService 埋点异常** → 仅 log warning，业务逻辑不受影响

所有 tracing 代码遵循 fire-and-forget 原则：成功则记录，失败则静默忽略。

---

## 7. 测试策略

### 7.1 单元测试

| 测试类 | 覆盖 |
|--------|------|
| `AiTracingAdvisorTest` | before() 创建 Observation、after() 停止 Observation、异常时降级、自定义 tag 存在 |
| `AiObservationConventionTest` | Convention 返回预期 span 名称和 key values |
| `QueryRewriterTest`（扩展） | 验证 rewrite() 在 tracing 启用/禁用时的行为 |
| `ArticleVectorServiceTest`（扩展） | 验证 search() 的 Observation 创建 |

### 7.2 集成测试

- `AiTracingIntegrationTest`：发送一次真实 chat 请求，验证 Zipkin exporter 收到 trace
- 使用 `TestObservationRegistry` 替代真实 Zipkin endpoint，避免依赖外部容器

---

## 8. 交付清单

| 类型 | 文件 | 估算行数 |
|------|------|---------|
| **新增** | `module/ai/tracing/AiTracingAdvisor.java` | ~100 行 |
| **新增** | `module/ai/tracing/AiObservationConvention.java` | ~40 行 |
| **新增** | `module/ai/tracing/AiTracingConfig.java` | ~30 行 |
| **新增** | `module/ai/tracing/AiTracingAdvisorTest.java` | ~80 行 |
| **新增** | `module/ai/tracing/AiObservationConventionTest.java` | ~30 行 |
| **改动** | `config/AiConfig.java` | +5 行 |
| **改动** | `service/QueryRewriter.java` | +20 行 |
| **改动** | `service/ArticleVectorService.java` | +15 行 |
| **改动** | `pom.xml` | +12 行 |
| **改动** | `application.yml` | +8 行 |
| **改动** | `docker-compose.yml` | +6 行 |
| **合计** | | ~350 行 |

---

## 9. 风险与缓解

| 风险 | 概率 | 缓解 |
|------|------|------|
| Spring AI 2.0.0 ChatClient 无内置 Observation | 中 | AiTracingAdvisor 在最外层包裹整个链，可替代自动埋点 |
| OpenTelemetry exporter 版本不兼容 | 低 | 使用 Spring Boot 4 管理的版本，不单独指定 |
| Zipkin Docker 镜像拉取失败 | 低 | 仅影响可观测性，不影响业务 |
| 生产环境采样率需调整 | 低 | `management.tracing.sampling.probability` 已外置为配置项 |
