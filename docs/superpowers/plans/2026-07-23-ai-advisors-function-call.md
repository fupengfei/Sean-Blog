# AI 客服重构（Advisors API + Function Call）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用 Spring AI 2.0 Advisors API + Function Call 重构智能客服：五层 Advisor 链（持久化/日志/记忆/当前文章/RAG）+ 8 个站点工具，对话记忆服务端 Redis 管理，完整问答含 IP/设备元数据落库。

**Architecture:** ChatController 瘦身为参数捕获 + ChatClient 调用；对话增强逻辑全部收敛为 Advisor（order 0→300）；模型记忆（Redis 窗口化）与审计流水（MySQL 完整）两条独立链路；站点能力通过 `@Tool` 暴露，写类工具经 ToolContext 获取会话 IP。

**Tech Stack:** Spring AI 2.0.0（BOM 已引入）、Spring Boot、MyBatis、Redis（StringRedisTemplate）、JUnit 5 + Mockito、Next.js 14

**设计文档:** `docs/superpowers/specs/2026-07-23-ai-advisors-function-call-design.md`

## Global Constraints

- Spring AI 版本固定 **2.0.0**（现有 BOM），不引入新 Maven 依赖（自定义 Redis 记忆仓库复用现有 `spring-boot-starter-data-redis`）
- 所有 UI 遵循设计系统：主色 Navy `#002045`、Green `#0a6c44`，8px 倍数间距
- 任何辅助链路（Redis/DB/向量检索/工具）故障一律降级为纯聊天，绝不中断 SSE 流
- 审计落库全异步（`@Async("chatPersistExecutor")`），失败仅记 warn 日志
- 工具返回值统一截断（文章正文 ≤8000 字符、文件内容 ≤10000 字符）；工具内部异常不外抛
- 中文注释沿用项目现有风格；提交信息用中文、格式沿用 `feat:/fix:/refactor:` 前缀
- 前后端同批发布（`ChatRequest.history` 字段删除无兼容期）

---

## 文件结构

**新建（后端）**

| 文件 | 职责 |
|------|------|
| `backend/src/main/java/com/sean/blog/module/ai/config/ChatProperties.java` | `sean.ai.chat.*` 配置绑定（窗口/TTL/RAG 参数） |
| `backend/src/main/resources/db/migration/V8__ai_chat_session_message.sql` | 会话 + 消息两张审计表 |
| `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatSession.java` | 会话实体 |
| `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatMessage.java` | 消息实体 |
| `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatSessionMapper.java` + `backend/src/main/resources/mapper/AiChatSessionMapper.xml` | 会话 DAO |
| `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatMessageMapper.java` + `backend/src/main/resources/mapper/AiChatMessageMapper.xml` | 消息 DAO |
| `backend/src/main/java/com/sean/blog/module/ai/service/ChatPersistenceService.java` | 异步会话/消息落库 |
| `backend/src/main/java/com/sean/blog/module/ai/advisor/ConversationPersistenceAdvisor.java` | order 0，审计落库 advisor |
| `backend/src/main/java/com/sean/blog/module/ai/memory/SpringRedisChatMemoryRepository.java` | 自定义 `ChatMemoryRepository`（StringRedisTemplate） |
| `backend/src/main/java/com/sean/blog/module/ai/memory/ResilientChatMemory.java` | ChatMemory 降级装饰器 |
| `backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleContextAdvisor.java` | order 300，当前文章注入 |
| `backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleRetrievalAdvisor.java` | order 200，RAG 注入（补 slug） |
| `backend/src/main/java/com/sean/blog/module/ai/tool/ArticleTools.java` | 文章工具（2 个） |
| `backend/src/main/java/com/sean/blog/module/ai/tool/ProjectTools.java` | 项目工具（1 个） |
| `backend/src/main/java/com/sean/blog/module/ai/tool/SkillTools.java` | Skill 工具（3 个） |
| `backend/src/main/java/com/sean/blog/module/ai/tool/ContactTools.java` | 联系工具（2 个） |
| `backend/src/main/java/com/sean/blog/common/ClientIpResolver.java` | 客户端 IP 提取（从 ContactService 抽出） |
| 各对应 `backend/src/test/java/...` 测试类 | 单元测试 |

**修改**

| 文件 | 改动 |
|------|------|
| `backend/src/main/resources/application.yml` | 新增 `sean.ai.chat` 段 |
| `backend/src/main/java/com/sean/blog/config/AsyncConfig.java` | 新增 `chatPersistExecutor` 线程池 |
| `backend/src/main/java/com/sean/blog/config/AiConfig.java` | 新增 ChatClient / ChatMemory / ChatMemoryRepository Bean |
| `backend/src/main/java/com/sean/blog/config/WebMvcConfig.java` | CORS 暴露 `X-Conversation-Id` 头 |
| `backend/src/main/java/com/sean/blog/module/contact/service/ContactService.java` | 新增不依赖 request 的重载；IP 提取改用 ClientIpResolver |
| `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java` | 瘦身重构 |
| `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java` | 新契约（message/conversationId/articleId） |
| `backend/src/main/resources/prompt/system-prompt.md` | 补充工具使用规范 |
| `frontend/src/app/api/v1/ai/chat/route.ts` | 透传 `X-Conversation-Id` |
| `frontend/src/components/chat/ChatProvider.tsx` | conversationId 管理、停发 history |
| `frontend/src/components/chat/ChatPanel.tsx` | 「新对话」按钮 |

**删除**

- `backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java`
- `backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java`
- `backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java`

---

### Task 1: 配置基础（ChatProperties + yml + Flyway + 实体 + Mapper）

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/config/ChatProperties.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/config/ChatPropertiesTest.java`
- Modify: `backend/src/main/resources/application.yml`（文件末尾 `file:` 段之后追加）
- Create: `backend/src/main/resources/db/migration/V8__ai_chat_session_message.sql`
- Create: `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatSession.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatMessage.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatSessionMapper.java`
- Create: `backend/src/main/resources/mapper/AiChatSessionMapper.xml`
- Create: `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatMessageMapper.java`
- Create: `backend/src/main/resources/mapper/AiChatMessageMapper.xml`

**Interfaces:**
- Consumes: 无
- Produces: `ChatProperties.getMemoryWindow(): int`、`getMemoryTtl(): Duration`、`getRag().getFetchSize()/getKeepSize(): int`；`AiChatSession`（id/conversationId/createdAt/lastActiveAt/ip/userAgent/messageCount，标准 getter/setter）；`AiChatMessage`（id/sessionId/role/content/createdAt）；`AiChatSessionMapper.insert/updateLastActive/incrementMessageCount/findByConversationId`；`AiChatMessageMapper.insert`

- [ ] **Step 1: 写 ChatProperties 失败测试**

```java
package com.sean.blog.module.ai.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ChatPropertiesTest {

    @Test
    void defaults() {
        ChatProperties props = new ChatProperties();
        assertEquals(20, props.getMemoryWindow());
        assertEquals(Duration.ofDays(7), props.getMemoryTtl());
        assertEquals(4, props.getRag().getFetchSize());
        assertEquals(3, props.getRag().getKeepSize());
    }

    @Test
    void settersWork() {
        ChatProperties props = new ChatProperties();
        props.setMemoryWindow(10);
        props.setMemoryTtl(Duration.ofDays(1));
        props.getRag().setFetchSize(6);
        props.getRag().setKeepSize(2);
        assertEquals(10, props.getMemoryWindow());
        assertEquals(Duration.ofDays(1), props.getMemoryTtl());
        assertEquals(6, props.getRag().getFetchSize());
        assertEquals(2, props.getRag().getKeepSize());
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ChatPropertiesTest`
Expected: 编译失败（ChatProperties 不存在）

- [ ] **Step 3: 实现 ChatProperties**

```java
package com.sean.blog.module.ai.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * AI 聊天配置（sean.ai.chat.*）：记忆窗口、Redis 记忆 TTL、RAG 检索参数。
 */
@ConfigurationProperties(prefix = "sean.ai.chat")
public class ChatProperties {

    /** 模型上下文记忆窗口（条数） */
    private int memoryWindow = 20;

    /** Redis 会话记忆 TTL */
    private Duration memoryTtl = Duration.ofDays(7);

    private Rag rag = new Rag();

    public int getMemoryWindow() { return memoryWindow; }
    public void setMemoryWindow(int memoryWindow) { this.memoryWindow = memoryWindow; }
    public Duration getMemoryTtl() { return memoryTtl; }
    public void setMemoryTtl(Duration memoryTtl) { this.memoryTtl = memoryTtl; }
    public Rag getRag() { return rag; }
    public void setRag(Rag rag) { this.rag = rag; }

    /** RAG 向量检索参数 */
    public static class Rag {
        /** 向量检索取数 */
        private int fetchSize = 4;
        /** 剔除当前文章后注入上限 */
        private int keepSize = 3;

        public int getFetchSize() { return fetchSize; }
        public void setFetchSize(int fetchSize) { this.fetchSize = fetchSize; }
        public int getKeepSize() { return keepSize; }
        public void setKeepSize(int keepSize) { this.keepSize = keepSize; }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ChatPropertiesTest`
Expected: PASS（2 个测试）

- [ ] **Step 5: application.yml 追加配置段**

在 `application.yml` 末尾（`file:` 段之后）追加：

```yaml

# ---- AI 聊天配置 ----
sean:
  ai:
    chat:
      memory-window: 20        # 模型上下文记忆窗口（条）
      memory-ttl: 7d           # Redis 会话记忆 TTL
      rag:
        fetch-size: 4          # RAG 向量检索取数
        keep-size: 3           # 注入相关文章上限
```

- [ ] **Step 6: Flyway 迁移脚本**

创建 `backend/src/main/resources/db/migration/V8__ai_chat_session_message.sql`：

```sql
-- AI 客服对话审计：会话表（一行一个 conversationId）
CREATE TABLE ai_chat_session (
    id               BIGINT       NOT NULL COMMENT '雪花 ID',
    conversation_id  VARCHAR(36)  NOT NULL COMMENT 'UUID，对外暴露的会话标识',
    created_at       DATETIME     NOT NULL COMMENT '首次提问时间',
    last_active_at   DATETIME     NOT NULL COMMENT '最近问答时间',
    ip               VARCHAR(64)  DEFAULT NULL COMMENT '客户端 IP',
    user_agent       VARCHAR(512) DEFAULT NULL COMMENT '设备标识（User-Agent）',
    message_count    INT          NOT NULL DEFAULT 0 COMMENT '消息数（user+assistant，奇数表示中断会话）',
    PRIMARY KEY (id),
    UNIQUE KEY uk_conversation_id (conversation_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 客服会话';

-- AI 客服对话审计：消息流水（完整问答，永不窗口化）
CREATE TABLE ai_chat_message (
    id          BIGINT       NOT NULL COMMENT '雪花 ID',
    session_id  BIGINT       NOT NULL COMMENT '逻辑关联 ai_chat_session.id',
    role        VARCHAR(16)  NOT NULL COMMENT 'user / assistant',
    content     MEDIUMTEXT   NOT NULL COMMENT '原始问题 / 最终回答全文',
    created_at  DATETIME     NOT NULL,
    PRIMARY KEY (id),
    KEY idx_session_created (session_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 客服消息流水';
```

- [ ] **Step 7: 实体类**

创建 `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatSession.java`：

```java
package com.sean.blog.module.ai.entity;

import java.time.LocalDateTime;

/** AI 客服会话（ai_chat_session 表）。 */
public class AiChatSession {

    private Long id;
    private String conversationId;
    private LocalDateTime createdAt;
    private LocalDateTime lastActiveAt;
    private String ip;
    private String userAgent;
    private Integer messageCount;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getConversationId() { return conversationId; }
    public void setConversationId(String conversationId) { this.conversationId = conversationId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public LocalDateTime getLastActiveAt() { return lastActiveAt; }
    public void setLastActiveAt(LocalDateTime lastActiveAt) { this.lastActiveAt = lastActiveAt; }
    public String getIp() { return ip; }
    public void setIp(String ip) { this.ip = ip; }
    public String getUserAgent() { return userAgent; }
    public void setUserAgent(String userAgent) { this.userAgent = userAgent; }
    public Integer getMessageCount() { return messageCount; }
    public void setMessageCount(Integer messageCount) { this.messageCount = messageCount; }
}
```

创建 `backend/src/main/java/com/sean/blog/module/ai/entity/AiChatMessage.java`：

```java
package com.sean.blog.module.ai.entity;

import java.time.LocalDateTime;

/** AI 客服消息流水（ai_chat_message 表）。 */
public class AiChatMessage {

    private Long id;
    private Long sessionId;
    private String role;
    private String content;
    private LocalDateTime createdAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
```

- [ ] **Step 8: Mapper 接口与 XML**

创建 `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatSessionMapper.java`：

```java
package com.sean.blog.module.ai.mapper;

import com.sean.blog.module.ai.entity.AiChatSession;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDateTime;

/** AI 客服会话 Mapper。 */
@Mapper
public interface AiChatSessionMapper {

    int insert(AiChatSession session);

    int updateLastActive(@Param("id") Long id, @Param("lastActiveAt") LocalDateTime lastActiveAt);

    int incrementMessageCount(@Param("id") Long id, @Param("delta") int delta);

    AiChatSession findByConversationId(@Param("conversationId") String conversationId);
}
```

创建 `backend/src/main/resources/mapper/AiChatSessionMapper.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.ai.mapper.AiChatSessionMapper">

    <insert id="insert" parameterType="com.sean.blog.module.ai.entity.AiChatSession">
        INSERT INTO ai_chat_session
            (id, conversation_id, created_at, last_active_at, ip, user_agent, message_count)
        VALUES
            (#{id}, #{conversationId}, #{createdAt}, #{lastActiveAt}, #{ip}, #{userAgent}, #{messageCount})
    </insert>

    <update id="updateLastActive">
        UPDATE ai_chat_session SET last_active_at = #{lastActiveAt} WHERE id = #{id}
    </update>

    <update id="incrementMessageCount">
        UPDATE ai_chat_session SET message_count = message_count + #{delta} WHERE id = #{id}
    </update>

    <select id="findByConversationId" resultType="com.sean.blog.module.ai.entity.AiChatSession">
        SELECT id, conversation_id AS conversationId, created_at AS createdAt,
               last_active_at AS lastActiveAt, ip, user_agent AS userAgent,
               message_count AS messageCount
        FROM ai_chat_session
        WHERE conversation_id = #{conversationId}
    </select>
</mapper>
```

创建 `backend/src/main/java/com/sean/blog/module/ai/mapper/AiChatMessageMapper.java`：

```java
package com.sean.blog.module.ai.mapper;

import com.sean.blog.module.ai.entity.AiChatMessage;
import org.apache.ibatis.annotations.Mapper;

/** AI 客服消息 Mapper。 */
@Mapper
public interface AiChatMessageMapper {

    int insert(AiChatMessage message);
}
```

创建 `backend/src/main/resources/mapper/AiChatMessageMapper.xml`：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.ai.mapper.AiChatMessageMapper">

    <insert id="insert" parameterType="com.sean.blog.module.ai.entity.AiChatMessage">
        INSERT INTO ai_chat_message (id, session_id, role, content, created_at)
        VALUES (#{id}, #{sessionId}, #{role}, #{content}, #{createdAt})
    </insert>
</mapper>
```

- [ ] **Step 9: 编译验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q clean compile && mvn -q test -Dtest=ChatPropertiesTest`
Expected: BUILD 成功，测试 PASS

- [ ] **Step 10: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/config/ChatProperties.java \
        backend/src/test/java/com/sean/blog/module/ai/config/ChatPropertiesTest.java \
        backend/src/main/resources/application.yml \
        backend/src/main/resources/db/migration/V8__ai_chat_session_message.sql \
        backend/src/main/java/com/sean/blog/module/ai/entity/ \
        backend/src/main/java/com/sean/blog/module/ai/mapper/ \
        backend/src/main/resources/mapper/AiChatSessionMapper.xml \
        backend/src/main/resources/mapper/AiChatMessageMapper.xml
git commit -m "feat(ai): 对话审计数据基础（配置/迁移脚本/实体/Mapper）"
```

---

### Task 2: ClientIpResolver + ContactService 重载

**Files:**
- Create: `backend/src/main/java/com/sean/blog/common/ClientIpResolver.java`
- Create: `backend/src/test/java/com/sean/blog/common/ClientIpResolverTest.java`
- Modify: `backend/src/main/java/com/sean/blog/module/contact/service/ContactService.java`
- Create: `backend/src/test/java/com/sean/blog/module/contact/service/ContactServiceTest.java`

**Interfaces:**
- Consumes: `ContactRecordMapper.insert(ContactRecord)`、`SnowflakeIdGenerator.nextId()`
- Produces: `ClientIpResolver.resolve(HttpServletRequest): String`；`ContactService.recordResume(String ipAddress, String companyName, String email)`、`ContactService.recordSubscribe(String ipAddress, String email)`（request 版重载委托给新版）

- [ ] **Step 1: 写 ClientIpResolver 失败测试**

```java
package com.sean.blog.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class ClientIpResolverTest {

    private final ClientIpResolver resolver = new ClientIpResolver();

    @Test
    void prefersXForwardedForFirstIp() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("1.2.3.4, 5.6.7.8");
        assertEquals("1.2.3.4", resolver.resolve(req));
    }

    @Test
    void skipsUnknownHeaderValues() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("unknown");
        when(req.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(req.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("9.9.9.9");
        assertEquals("9.9.9.9", resolver.resolve(req));
    }

    @Test
    void fallsBackToRemoteAddr() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn(null);
        when(req.getHeader("Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("WL-Proxy-Client-IP")).thenReturn(null);
        when(req.getHeader("HTTP_CLIENT_IP")).thenReturn(null);
        when(req.getHeader("HTTP_X_FORWARDED_FOR")).thenReturn(null);
        when(req.getRemoteAddr()).thenReturn("127.0.0.1");
        assertEquals("127.0.0.1", resolver.resolve(req));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ClientIpResolverTest`
Expected: 编译失败（ClientIpResolver 不存在）

- [ ] **Step 3: 实现 ClientIpResolver**

```java
package com.sean.blog.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;

/**
 * 客户端真实 IP 提取器。
 *
 * <p>依次检查 X-Forwarded-For、Proxy-Client-IP 等代理头部，最后回退到 RemoteAddr。
 * 多级代理时 X-Forwarded-For 为逗号分隔列表，取第一个（最接近客户端的 IP）。</p>
 */
@Component
public class ClientIpResolver {

    public String resolve(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("HTTP_CLIENT_IP");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getHeader("HTTP_X_FORWARDED_FOR");
        }
        if (isEmptyOrUnknown(ip)) {
            ip = request.getRemoteAddr();
        }
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }

    private boolean isEmptyOrUnknown(String ip) {
        return ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip);
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ClientIpResolverTest`
Expected: PASS（3 个测试）

- [ ] **Step 5: 写 ContactService 重载失败测试**

```java
package com.sean.blog.module.contact.service;

import com.sean.blog.common.ClientIpResolver;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.contact.entity.ContactRecord;
import com.sean.blog.module.contact.mapper.ContactRecordMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ContactServiceTest {

    @Mock
    private ContactRecordMapper contactRecordMapper;

    private final SnowflakeIdGenerator idGenerator = new SnowflakeIdGenerator();

    private ContactService service() {
        return new ContactService(contactRecordMapper, idGenerator, new ClientIpResolver());
    }

    @Test
    void recordResumeWithIpString() {
        service().recordResume("1.2.3.4", "Acme", "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper).insert(captor.capture());
        ContactRecord record = captor.getValue();
        assertEquals("RESUME", record.getType());
        assertEquals("1.2.3.4", record.getIpAddress());
        assertEquals("Acme", record.getCompanyName());
        assertEquals("a@b.com", record.getEmail());
    }

    @Test
    void recordSubscribeWithIpString() {
        service().recordSubscribe("1.2.3.4", "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper).insert(captor.capture());
        assertEquals("SUBSCRIBE", captor.getValue().getType());
        assertEquals("1.2.3.4", captor.getValue().getIpAddress());
    }

    @Test
    void requestBasedOverloadsDelegateToResolver() {
        HttpServletRequest req = mock(HttpServletRequest.class);
        when(req.getHeader("X-Forwarded-For")).thenReturn("8.8.8.8");

        service().recordResume(req, "Acme", "a@b.com");
        service().recordSubscribe(req, "a@b.com");

        ArgumentCaptor<ContactRecord> captor = ArgumentCaptor.forClass(ContactRecord.class);
        verify(contactRecordMapper, org.mockito.Mockito.times(2)).insert(captor.capture());
        captor.getAllValues().forEach(r -> assertEquals("8.8.8.8", r.getIpAddress()));
    }
}
```

- [ ] **Step 6: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ContactServiceTest`
Expected: 编译失败（三参构造函数与新重载不存在）

- [ ] **Step 7: 改造 ContactService**

修改 `backend/src/main/java/com/sean/blog/module/contact/service/ContactService.java`：

1. 构造函数加入 `ClientIpResolver`：

```java
    private final ContactRecordMapper contactRecordMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final ClientIpResolver clientIpResolver;

    public ContactService(ContactRecordMapper contactRecordMapper,
                          SnowflakeIdGenerator idGenerator,
                          ClientIpResolver clientIpResolver) {
        this.contactRecordMapper = contactRecordMapper;
        this.idGenerator = idGenerator;
        this.clientIpResolver = clientIpResolver;
    }
```

2. 四个 record 方法改为委托「IP 字符串版」重载（新增 RESUME / SUBSCRIBE 两个公开重载；BUSINESS / MAIL 私有委托）：

```java
    /**
     * 记录首页商务合作请求。
     */
    public void recordBusiness(HttpServletRequest request, String companyName, String email, String content) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("BUSINESS");
        record.setContent(content);
        record.setCompanyName(companyName);
        record.setEmail(email);
        record.setIpAddress(clientIpResolver.resolve(request));
        contactRecordMapper.insert(record);
    }

    /**
     * 记录"关于我"页面发送邮件请求。
     */
    public void recordMail(HttpServletRequest request, String email, String content) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("MAIL");
        record.setContent(content);
        record.setEmail(email);
        record.setIpAddress(clientIpResolver.resolve(request));
        contactRecordMapper.insert(record);
    }

    /**
     * 记录用户获取简历请求（IP 字符串版，供 AI 工具等非 Web 上下文调用）。
     *
     * @param ipAddress   调用方捕获的客户端 IP
     * @param companyName 公司名称（可为 null）
     * @param email       邮箱
     */
    public void recordResume(String ipAddress, String companyName, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("RESUME");
        record.setCompanyName(companyName);
        record.setEmail(email);
        record.setIpAddress(ipAddress);
        contactRecordMapper.insert(record);
    }

    /**
     * 记录用户获取简历请求。
     */
    public void recordResume(HttpServletRequest request, String companyName, String email) {
        recordResume(clientIpResolver.resolve(request), companyName, email);
    }

    /**
     * 记录用户订阅请求（IP 字符串版，供 AI 工具等非 Web 上下文调用）。
     *
     * @param ipAddress 调用方捕获的客户端 IP
     * @param email     订阅邮箱
     */
    public void recordSubscribe(String ipAddress, String email) {
        ContactRecord record = new ContactRecord();
        record.setId(idGenerator.nextId());
        record.setType("SUBSCRIBE");
        record.setEmail(email);
        record.setIpAddress(ipAddress);
        contactRecordMapper.insert(record);
    }

    /**
     * 记录用户订阅请求。
     */
    public void recordSubscribe(HttpServletRequest request, String email) {
        recordSubscribe(clientIpResolver.resolve(request), email);
    }
```

3. 删除私有方法 `getIpAddress(HttpServletRequest)`（逻辑已迁移到 `ClientIpResolver`）。

- [ ] **Step 8: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ContactServiceTest,ClientIpResolverTest`
Expected: PASS（6 个测试）

- [ ] **Step 9: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/common/ClientIpResolver.java \
        backend/src/test/java/com/sean/blog/common/ClientIpResolverTest.java \
        backend/src/main/java/com/sean/blog/module/contact/service/ContactService.java \
        backend/src/test/java/com/sean/blog/module/contact/service/ContactServiceTest.java
git commit -m "refactor(contact): 抽出 ClientIpResolver，ContactService 新增 IP 字符串重载"
```

---

### Task 3: chatPersistExecutor 线程池 + ChatPersistenceService

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/config/AsyncConfig.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/service/ChatPersistenceService.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/service/ChatPersistenceServiceTest.java`

**Interfaces:**
- Consumes: `AiChatSessionMapper`、`AiChatMessageMapper`、`SnowflakeIdGenerator`（Task 1）
- Produces: `ChatPersistenceService.persistUserTurn(String conversationId, String ip, String userAgent, String userText)`、`ChatPersistenceService.persistAssistantTurn(String conversationId, String assistantText)`（均 `@Async("chatPersistExecutor")`，void，异常内部吞掉仅记日志）

- [ ] **Step 1: AsyncConfig 新增线程池**

在 `AsyncConfig.java` 的 `geoExecutor()` 方法之后追加（沿用现有模式）：

```java
    /**
     * AI 对话审计落库线程池。
     *
     * <p>配置参数：
     * <ul>
     *   <li>核心线程数：2</li>
     *   <li>最大线程数：2</li>
     *   <li>队列容量：1000</li>
     *   <li>拒绝策略：静默丢弃（审计丢失可接受，不可拖垮聊天主链路）</li>
     * </ul>
     * </p>
     *
     * @return 配置好的 chatPersistExecutor 线程池
     */
    @Bean("chatPersistExecutor")
    public Executor chatPersistExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("chat-persist-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy() {
            @Override
            public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
                System.err.println("Chat persistence dropped: async queue full");
            }
        });
        executor.initialize();
        return executor;
    }
```

- [ ] **Step 2: 写 ChatPersistenceService 失败测试**

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.ai.entity.AiChatMessage;
import com.sean.blog.module.ai.entity.AiChatSession;
import com.sean.blog.module.ai.mapper.AiChatMessageMapper;
import com.sean.blog.module.ai.mapper.AiChatSessionMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatPersistenceServiceTest {

    @Mock
    private AiChatSessionMapper sessionMapper;
    @Mock
    private AiChatMessageMapper messageMapper;

    private ChatPersistenceService service;

    @BeforeEach
    void setUp() {
        service = new ChatPersistenceService(sessionMapper, messageMapper, new SnowflakeIdGenerator());
    }

    @Test
    void userTurnInsertsSessionAndMessageWhenAbsent() {
        when(sessionMapper.findByConversationId("cid-1")).thenReturn(null);

        service.persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");

        ArgumentCaptor<AiChatSession> sessionCaptor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).insert(sessionCaptor.capture());
        AiChatSession session = sessionCaptor.getValue();
        assertEquals("cid-1", session.getConversationId());
        assertEquals("1.2.3.4", session.getIp());
        assertEquals("UA", session.getUserAgent());
        assertEquals(0, session.getMessageCount());

        ArgumentCaptor<AiChatMessage> msgCaptor = ArgumentCaptor.forClass(AiChatMessage.class);
        verify(messageMapper).insert(msgCaptor.capture());
        assertEquals("user", msgCaptor.getValue().getRole());
        assertEquals("你好", msgCaptor.getValue().getContent());
        assertEquals(session.getId(), msgCaptor.getValue().getSessionId());
        verify(sessionMapper).incrementMessageCount(session.getId(), 1);
    }

    @Test
    void userTurnUpdatesLastActiveWhenSessionExists() {
        AiChatSession existing = new AiChatSession();
        existing.setId(99L);
        existing.setConversationId("cid-1");
        when(sessionMapper.findByConversationId("cid-1")).thenReturn(existing);

        service.persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");

        verify(sessionMapper, never()).insert(any());
        verify(sessionMapper).updateLastActive(eq(99L), any(LocalDateTime.class));
        verify(messageMapper).insert(any());
        verify(sessionMapper).incrementMessageCount(99L, 1);
    }

    @Test
    void assistantTurnCreatesSessionFallbackWhenAbsent() {
        when(sessionMapper.findByConversationId("cid-2")).thenReturn(null);

        service.persistAssistantTurn("cid-2", "回答");

        ArgumentCaptor<AiChatSession> sessionCaptor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).insert(sessionCaptor.capture());
        assertEquals("cid-2", sessionCaptor.getValue().getConversationId());

        ArgumentCaptor<AiChatMessage> msgCaptor = ArgumentCaptor.forClass(AiChatMessage.class);
        verify(messageMapper).insert(msgCaptor.capture());
        assertEquals("assistant", msgCaptor.getValue().getRole());
        assertEquals("回答", msgCaptor.getValue().getContent());
    }

    @Test
    void userAgentTruncatedTo512() {
        when(sessionMapper.findByConversationId("cid-3")).thenReturn(null);
        String longUa = "x".repeat(600);

        service.persistUserTurn("cid-3", "1.1.1.1", longUa, "hi");

        ArgumentCaptor<AiChatSession> captor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).insert(captor.capture());
        assertEquals(512, captor.getValue().getUserAgent().length());
    }

    @Test
    void dbFailureSwallowed() {
        when(sessionMapper.findByConversationId("cid-4")).thenReturn(null);
        org.mockito.Mockito.doThrow(new RuntimeException("db down")).when(sessionMapper).insert(any());

        // 不应抛出异常
        service.persistUserTurn("cid-4", "1.1.1.1", "UA", "hi");

        verify(messageMapper, never()).insert(any());
    }
}
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ChatPersistenceServiceTest`
Expected: 编译失败（ChatPersistenceService 不存在）

- [ ] **Step 4: 实现 ChatPersistenceService**

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.ai.entity.AiChatMessage;
import com.sean.blog.module.ai.entity.AiChatSession;
import com.sean.blog.module.ai.mapper.AiChatMessageMapper;
import com.sean.blog.module.ai.mapper.AiChatSessionMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

/**
 * AI 对话审计持久化服务。
 *
 * <p>所有方法异步执行（{@code chatPersistExecutor}），任何异常仅记 warn 日志——
 * 审计链路绝不允许拖垮聊天主链路。</p>
 *
 * <p>一次用户轮次（userTurn）与助手轮次（assistantTurn）各自独立完成
 * 「session upsert + 消息写入 + 计数递增」，互不依赖执行顺序。</p>
 */
@Service
public class ChatPersistenceService {

    private static final Logger log = LoggerFactory.getLogger(ChatPersistenceService.class);

    /** user_agent 列长度上限 */
    private static final int MAX_USER_AGENT_LENGTH = 512;

    private final AiChatSessionMapper sessionMapper;
    private final AiChatMessageMapper messageMapper;
    private final SnowflakeIdGenerator idGenerator;

    public ChatPersistenceService(AiChatSessionMapper sessionMapper,
                                  AiChatMessageMapper messageMapper,
                                  SnowflakeIdGenerator idGenerator) {
        this.sessionMapper = sessionMapper;
        this.messageMapper = messageMapper;
        this.idGenerator = idGenerator;
    }

    /**
     * 持久化用户轮次：upsert 会话（含 IP/UA 元数据）+ 写 user 消息 + 计数 +1。
     */
    @Async("chatPersistExecutor")
    public void persistUserTurn(String conversationId, String ip, String userAgent, String userText) {
        try {
            LocalDateTime now = LocalDateTime.now();
            AiChatSession session = sessionMapper.findByConversationId(conversationId);
            if (session == null) {
                session = new AiChatSession();
                session.setId(idGenerator.nextId());
                session.setConversationId(conversationId);
                session.setCreatedAt(now);
                session.setLastActiveAt(now);
                session.setIp(ip);
                session.setUserAgent(truncateUserAgent(userAgent));
                session.setMessageCount(0);
                sessionMapper.insert(session);
            } else {
                sessionMapper.updateLastActive(session.getId(), now);
            }
            insertMessage(session.getId(), "user", userText, now);
            sessionMapper.incrementMessageCount(session.getId(), 1);
        } catch (Exception e) {
            log.warn("Chat persistence failed (user turn, conversationId={}): {}", conversationId, e.getMessage());
        }
    }

    /**
     * 持久化助手轮次：写 assistant 消息 + 计数 +1。
     * 会话不存在时兜底创建（无 IP/UA 元数据，理论上不应发生）。
     */
    @Async("chatPersistExecutor")
    public void persistAssistantTurn(String conversationId, String assistantText) {
        try {
            LocalDateTime now = LocalDateTime.now();
            AiChatSession session = sessionMapper.findByConversationId(conversationId);
            if (session == null) {
                log.warn("Assistant turn arrived without session, creating fallback (conversationId={})", conversationId);
                session = new AiChatSession();
                session.setId(idGenerator.nextId());
                session.setConversationId(conversationId);
                session.setCreatedAt(now);
                session.setLastActiveAt(now);
                session.setMessageCount(0);
                sessionMapper.insert(session);
            } else {
                sessionMapper.updateLastActive(session.getId(), now);
            }
            insertMessage(session.getId(), "assistant", assistantText, now);
            sessionMapper.incrementMessageCount(session.getId(), 1);
        } catch (Exception e) {
            log.warn("Chat persistence failed (assistant turn, conversationId={}): {}", conversationId, e.getMessage());
        }
    }

    private void insertMessage(Long sessionId, String role, String content, LocalDateTime now) {
        AiChatMessage message = new AiChatMessage();
        message.setId(idGenerator.nextId());
        message.setSessionId(sessionId);
        message.setRole(role);
        message.setContent(content);
        message.setCreatedAt(now);
        messageMapper.insert(message);
    }

    private String truncateUserAgent(String userAgent) {
        if (userAgent == null) {
            return null;
        }
        return userAgent.length() > MAX_USER_AGENT_LENGTH
                ? userAgent.substring(0, MAX_USER_AGENT_LENGTH)
                : userAgent;
    }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ChatPersistenceServiceTest`
Expected: PASS（5 个测试）

- [ ] **Step 6: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/config/AsyncConfig.java \
        backend/src/main/java/com/sean/blog/module/ai/service/ChatPersistenceService.java \
        backend/src/test/java/com/sean/blog/module/ai/service/ChatPersistenceServiceTest.java
git commit -m "feat(ai): 对话审计持久化服务（异步落库 + 独立线程池）"
```

---

### Task 4: ConversationPersistenceAdvisor（order 0）

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/advisor/ConversationPersistenceAdvisor.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/advisor/ConversationPersistenceAdvisorTest.java`

**Interfaces:**
- Consumes: `ChatPersistenceService.persistUserTurn/persistAssistantTurn`（Task 3）
- Produces: `ConversationPersistenceAdvisor` Bean（实现 `BaseAdvisor`，order 0）；advisor 参数键常量 `IP_KEY="chatIp"`、`USER_AGENT_KEY="chatUserAgent"`（conversationId 用 Spring AI 的 `ChatMemory.CONVERSATION_ID`）

- [ ] **Step 1: 写失败测试**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ChatPersistenceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ConversationPersistenceAdvisorTest {

    @Mock
    private ChatPersistenceService persistenceService;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ConversationPersistenceAdvisor advisor() {
        return new ConversationPersistenceAdvisor(persistenceService);
    }

    @Test
    void orderIsZero() {
        assertEquals(0, advisor().getOrder());
    }

    @Test
    void beforePersistsUserTurn() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1",
                        ConversationPersistenceAdvisor.IP_KEY, "1.2.3.4",
                        ConversationPersistenceAdvisor.USER_AGENT_KEY, "UA"));

        ChatClientRequest out = advisor().before(request, chain);

        assertSame(request, out);
        verify(persistenceService).persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");
    }

    @Test
    void afterPersistsAssistantTurn() {
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(new Generation(new AssistantMessage("回答"))),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1"));

        ChatClientResponse out = advisor().after(response, chain);

        assertSame(response, out);
        verify(persistenceService).persistAssistantTurn("cid-1", "回答");
    }

    @Test
    void skipsWhenNoConversationId() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")), Map.of());
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(new Generation(new AssistantMessage("回答"))), Map.of());

        advisor().before(request, chain);
        advisor().after(response, chain);

        verifyNoInteractions(persistenceService);
    }

    @Test
    void afterSkipsBlankAssistantText() {
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(new Generation(new AssistantMessage("   "))),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1"));

        advisor().after(response, chain);

        verifyNoInteractions(persistenceService);
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ConversationPersistenceAdvisorTest`
Expected: 编译失败（ConversationPersistenceAdvisor 不存在）

- [ ] **Step 3: 实现 ConversationPersistenceAdvisor**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ChatPersistenceService;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 对话审计 Advisor（order 0，链最外层）。
 *
 * <p>before：捕获原始用户问题，异步写会话元数据（IP/UA）+ user 消息行。
 * after：流式响应聚合完成后异步写 assistant 消息行。
 * 客户端中途断开时 after 不触发，user 行已写入——
 * {@code message_count} 为奇数即中断会话。</p>
 *
 * <p>位于链最外层，看到的是未被 RAG/文章上下文增强的原始问题。</p>
 */
@Component
public class ConversationPersistenceAdvisor implements BaseAdvisor {

    /** advisor 参数键：客户端 IP（Controller 捕获） */
    public static final String IP_KEY = "chatIp";

    /** advisor 参数键：User-Agent（Controller 捕获） */
    public static final String USER_AGENT_KEY = "chatUserAgent";

    private final ChatPersistenceService persistenceService;

    public ConversationPersistenceAdvisor(ChatPersistenceService persistenceService) {
        this.persistenceService = persistenceService;
    }

    @Override
    public String getName() {
        return "ConversationPersistenceAdvisor";
    }

    @Override
    public int getOrder() {
        return 0;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        String conversationId = conversationId(request.context().get(ChatMemory.CONVERSATION_ID));
        if (conversationId == null) {
            return request;
        }
        String userText = lastUserText(request.prompt().getInstructions());
        String ip = asString(request.context().get(IP_KEY));
        String userAgent = asString(request.context().get(USER_AGENT_KEY));
        if (userText != null && !userText.isBlank()) {
            persistenceService.persistUserTurn(conversationId, ip, userAgent, userText);
        }
        return request;
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        String conversationId = conversationId(response.context().get(ChatMemory.CONVERSATION_ID));
        if (conversationId == null) {
            return response;
        }
        ChatResponse chatResponse = response.chatResponse();
        if (chatResponse != null && chatResponse.getResult() != null
                && chatResponse.getResult().getOutput() != null) {
            String text = chatResponse.getResult().getOutput().getText();
            if (text != null && !text.isBlank()) {
                persistenceService.persistAssistantTurn(conversationId, text);
            }
        }
        return response;
    }

    private String conversationId(Object value) {
        return value instanceof String s && !s.isBlank() ? s : null;
    }

    private String asString(Object value) {
        return value instanceof String s ? s : null;
    }

    private String lastUserText(List<Message> messages) {
        for (int i = messages.size() - 1; i >= 0; i--) {
            Message m = messages.get(i);
            if (m.getMessageType() == MessageType.USER) {
                return m.getText();
            }
        }
        return null;
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ConversationPersistenceAdvisorTest`
Expected: PASS（5 个测试）

- [ ] **Step 5: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/advisor/ConversationPersistenceAdvisor.java \
        backend/src/test/java/com/sean/blog/module/ai/advisor/ConversationPersistenceAdvisorTest.java
git commit -m "feat(ai): ConversationPersistenceAdvisor 审计落库（order 0）"
```

---

### Task 5: SpringRedisChatMemoryRepository + ResilientChatMemory

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/memory/SpringRedisChatMemoryRepository.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/memory/SpringRedisChatMemoryRepositoryTest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/memory/ResilientChatMemory.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/memory/ResilientChatMemoryTest.java`

**Interfaces:**
- Consumes: `StringRedisTemplate`（Spring Boot 自动配置）、Jackson `ObjectMapper`、`ChatProperties.getMemoryTtl()`（Task 1）
- Produces: `SpringRedisChatMemoryRepository implements ChatMemoryRepository`（key 前缀 `chat:memory:`，值为 JSON 消息列表，EXPIRE 控制 TTL）；`ResilientChatMemory implements ChatMemory`（构造 `new ResilientChatMemory(ChatMemory delegate)`，读写异常降级）

- [ ] **Step 1: 写 SpringRedisChatMemoryRepository 失败测试**

```java
package com.sean.blog.module.ai.memory;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpringRedisChatMemoryRepositoryTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    private ListOperations<String, String> listOps;
    private SpringRedisChatMemoryRepository repository;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        listOps = mock(ListOperations.class);
        when(redisTemplate.opsForList()).thenReturn(listOps);
        repository = new SpringRedisChatMemoryRepository(
                redisTemplate, new ObjectMapper(), Duration.ofDays(7), "chat:memory:");
    }

    @Test
    void saveAllDeletesThenPushesAndExpires() {
        List<Message> messages = List.of(new UserMessage("问"), new AssistantMessage("答"));

        repository.saveAll("cid-1", messages);

        verify(redisTemplate).delete("chat:memory:cid-1");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(listOps).rightPushAll(eq("chat:memory:cid-1"), captor.capture());
        assertEquals(2, captor.getValue().size());
        assertTrue(captor.getValue().iterator().next().contains("\"type\":\"USER\""));
        verify(redisTemplate).expire("chat:memory:cid-1", Duration.ofDays(7));
    }

    @Test
    void findByConversationIdDeserializesBackToTypedMessages() {
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"问\"}",
                "{\"type\":\"ASSISTANT\",\"text\":\"答\"}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(2, messages.size());
        assertEquals(MessageType.USER, messages.get(0).getMessageType());
        assertEquals("问", messages.get(0).getText());
        assertEquals(MessageType.ASSISTANT, messages.get(1).getMessageType());
        assertEquals("答", messages.get(1).getText());
    }

    @Test
    void findByConversationIdReturnsEmptyWhenNoKey() {
        when(listOps.range("chat:memory:cid-x", 0, -1)).thenReturn(null);
        assertTrue(repository.findByConversationId("cid-x").isEmpty());
    }

    @Test
    void deleteRemovesKey() {
        repository.deleteByConversationId("cid-1");
        verify(redisTemplate).delete("chat:memory:cid-1");
    }

    @Test
    void findConversationIdsUnsupportedEmpty() {
        assertTrue(repository.findConversationIds().isEmpty());
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=SpringRedisChatMemoryRepositoryTest`
Expected: 编译失败（类不存在）

- [ ] **Step 3: 实现 SpringRedisChatMemoryRepository**

```java
package com.sean.blog.module.ai.memory;

import tools.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.core.JacksonException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 基于项目现有 StringRedisTemplate 的 ChatMemoryRepository 实现。
 *
 * <p>每个会话一个 Redis List（key：{@code 前缀 + conversationId}），
 * 消息以 JSON（{@link StoredMessage}）存储，整表 TTL 通过 EXPIRE 控制。
 * saveAll 为整窗口覆盖写（MessageWindowChatMemory 每次 add 都会重写窗口全量）。</p>
 *
 * <p>不用官方 spring-ai Redis starter 的原因：其依赖 RediSearch 模块且
 * 自动配置不支持密码，与本项目 redis:7-alpine + requirepass 部署不兼容。</p>
 *
 * <p>注意：项目为 Spring Boot 4 / Jackson 3，ObjectMapper 使用
 * {@code tools.jackson.databind} 包（异常为非受检的 JacksonException）。</p>
 */
public class SpringRedisChatMemoryRepository implements ChatMemoryRepository {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration ttl;
    private final String keyPrefix;

    public SpringRedisChatMemoryRepository(StringRedisTemplate redisTemplate,
                                           ObjectMapper objectMapper,
                                           Duration ttl,
                                           String keyPrefix) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttl = ttl;
        this.keyPrefix = keyPrefix;
    }

    /** Redis 中的消息存储形态（绕开 Spring AI Message 对象序列化问题） */
    record StoredMessage(String type, String text) {}

    @Override
    public List<String> findConversationIds() {
        // 本应用不做会话枚举，窗口式记忆无需此能力
        return List.of();
    }

    @Override
    public List<Message> findByConversationId(String conversationId) {
        List<String> raw = redisTemplate.opsForList().range(key(conversationId), 0, -1);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<Message> messages = new ArrayList<>(raw.size());
        for (String json : raw) {
            try {
                StoredMessage stored = objectMapper.readValue(json, StoredMessage.class);
                messages.add(toMessage(stored));
            } catch (JacksonException | IllegalArgumentException e) {
                // 损坏的单条记录跳过，不连累整个会话
            }
        }
        return messages;
    }

    @Override
    public void saveAll(String conversationId, List<Message> messages) {
        String key = key(conversationId);
        redisTemplate.delete(key);
        if (messages == null || messages.isEmpty()) {
            return;
        }
        List<String> serialized = new ArrayList<>(messages.size());
        for (Message message : messages) {
            serialized.add(objectMapper.writeValueAsString(
                    new StoredMessage(message.getMessageType().name(), message.getText())));
        }
        redisTemplate.opsForList().rightPushAll(key, serialized);
        redisTemplate.expire(key, ttl);
    }

    @Override
    public void deleteByConversationId(String conversationId) {
        redisTemplate.delete(key(conversationId));
    }

    private String key(String conversationId) {
        return keyPrefix + conversationId;
    }

    private Message toMessage(StoredMessage stored) {
        return switch (stored.type()) {
            case "USER" -> new UserMessage(stored.text());
            case "ASSISTANT" -> new AssistantMessage(stored.text());
            case "SYSTEM" -> new SystemMessage(stored.text());
            default -> throw new IllegalArgumentException("Unsupported message type: " + stored.type());
        };
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=SpringRedisChatMemoryRepositoryTest`
Expected: PASS（5 个测试）

- [ ] **Step 5: 写 ResilientChatMemory 失败测试**

```java
package com.sean.blog.module.ai.memory;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResilientChatMemoryTest {

    @Mock
    private ChatMemory delegate;

    @Test
    void delegatesHappyPath() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        List<Message> messages = List.of(new UserMessage("问"));
        when(delegate.get("cid")).thenReturn(messages);

        assertEquals(messages, memory.get("cid"));

        memory.add("cid", messages);
        verify(delegate).add("cid", messages);

        memory.clear("cid");
        verify(delegate).clear("cid");
    }

    @Test
    void getFailureReturnsEmpty() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        when(delegate.get("cid")).thenThrow(new RuntimeException("redis down"));

        assertTrue(memory.get("cid").isEmpty());
    }

    @Test
    void addFailureSwallowed() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        doThrow(new RuntimeException("redis down")).when(delegate).add(anyString(), anyList());

        // 不应抛出异常
        memory.add("cid", List.of(new UserMessage("问")));
    }

    @Test
    void clearFailureSwallowed() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        doThrow(new RuntimeException("redis down")).when(delegate).clear(anyString());

        memory.clear("cid");
    }
}
```

- [ ] **Step 6: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ResilientChatMemoryTest`
Expected: 编译失败（ResilientChatMemory 不存在）

- [ ] **Step 7: 实现 ResilientChatMemory**

```java
package com.sean.blog.module.ai.memory;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;

import java.util.List;

/**
 * ChatMemory 降级装饰器：Redis 故障时读返回空历史、写仅记日志，
 * 保证记忆层故障只导致「失忆」而不中断聊天。
 */
public class ResilientChatMemory implements ChatMemory {

    private static final Logger log = LoggerFactory.getLogger(ResilientChatMemory.class);

    private final ChatMemory delegate;

    public ResilientChatMemory(ChatMemory delegate) {
        this.delegate = delegate;
    }

    @Override
    public void add(String conversationId, List<Message> messages) {
        try {
            delegate.add(conversationId, messages);
        } catch (Exception e) {
            log.warn("Chat memory add failed (conversationId={}): {}", conversationId, e.getMessage());
        }
    }

    @Override
    public List<Message> get(String conversationId) {
        try {
            return delegate.get(conversationId);
        } catch (Exception e) {
            log.warn("Chat memory get failed, returning empty history (conversationId={}): {}",
                    conversationId, e.getMessage());
            return List.of();
        }
    }

    @Override
    public void clear(String conversationId) {
        try {
            delegate.clear(conversationId);
        } catch (Exception e) {
            log.warn("Chat memory clear failed (conversationId={}): {}", conversationId, e.getMessage());
        }
    }
}
```

- [ ] **Step 8: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ResilientChatMemoryTest,SpringRedisChatMemoryRepositoryTest`
Expected: PASS（9 个测试）

- [ ] **Step 9: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/memory/ \
        backend/src/test/java/com/sean/blog/module/ai/memory/
git commit -m "feat(ai): Redis 会话记忆仓库（StringRedisTemplate 自实现）+ 降级装饰器"
```

---

### Task 6: ArticleRetrievalAdvisor（order 200）+ ArticleContextAdvisor（order 300）

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleRetrievalAdvisor.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/advisor/ArticleRetrievalAdvisorTest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleContextAdvisor.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/advisor/ArticleContextAdvisorTest.java`

**Interfaces:**
- Consumes: `ArticleVectorService.search(String, int)`（返回 `List<LuceneVectorService.SearchResult>`，record 字段 `id()/title()/content()`）、`ArticleMapper.findSummaryByIds(List<Long>)`（返回含 id/title/slug 的 Article 列表，已过滤 PUBLISHED）、`ArticleContextService.buildArticleContext(Long)`（Task 无关，现有）、`ChatProperties.getRag()`（Task 1）
- Produces: 两个 Advisor Bean；共享常量 `ArticleContextAdvisor.ARTICLE_ID_PARAM = "articleId"`（RAG advisor 与 Controller 复用）

说明：两个 advisor 都以「前置区块」方式增强最后一条 UserMessage。链上 before() 执行顺序为 order 200（RAG）→ 300（当前文章），后执行的 advisor 把区块前置到更靠前的位置，最终文本为 `[当前文章区块][相关文章区块][用户问题]`——与重构前 `buildAugmentedMessage` 的区块顺序一致；system prompt 对区块的描述与顺序无关。

- [ ] **Step 1: 写 ArticleRetrievalAdvisor 失败测试**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.LuceneVectorService;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleRetrievalAdvisorTest {

    @Mock
    private ArticleVectorService vectorService;
    @Mock
    private ArticleMapper articleMapper;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ArticleRetrievalAdvisor advisor() {
        return new ArticleRetrievalAdvisor(vectorService, articleMapper, new ChatProperties());
    }

    private String lastUserText(ChatClientRequest request) {
        List<Message> messages = request.prompt().getInstructions();
        return messages.get(messages.size() - 1).getText();
    }

    private Article summary(long id, String slug) {
        Article a = new Article();
        a.setId(id);
        a.setSlug(slug);
        return a;
    }

    @Test
    void injectsRagBlockWithSlug() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "Java 入门", "摘要一", 0.9f)));
        when(articleMapper.findSummaryByIds(List.of(1L))).thenReturn(List.of(summary(1L, "java-intro-123")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        ChatClientRequest out = advisor().before(request, chain);

        String text = lastUserText(out);
        assertTrue(text.startsWith("以下是全站检索到的"));
        assertTrue(text.contains("---相关文章---"));
        assertTrue(text.contains("《Java 入门》"));
        assertTrue(text.contains("java-intro-123"));
        assertTrue(text.endsWith("java"));
    }

    @Test
    void excludesCurrentArticle() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "当前", "x", 0.9f),
                new LuceneVectorService.SearchResult("2", "其他", "y", 0.8f)));
        when(articleMapper.findSummaryByIds(List.of(2L))).thenReturn(List.of(summary(2L, "other-1")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 1L));
        String text = lastUserText(advisor().before(request, chain));

        assertFalse(text.contains("《当前》"));
        assertTrue(text.contains("《其他》"));
    }

    @Test
    void noResultsReturnsSameRequest() {
        when(vectorService.search(anyString(), anyInt())).thenReturn(List.of());

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void searchFailureDegradesToSameRequest() {
        when(vectorService.search(anyString(), anyInt())).thenThrow(new RuntimeException("embedding down"));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void limitsToKeepSize() {
        when(vectorService.search("java", 4)).thenReturn(List.of(
                new LuceneVectorService.SearchResult("1", "A", "a", 0.9f),
                new LuceneVectorService.SearchResult("2", "B", "b", 0.8f),
                new LuceneVectorService.SearchResult("3", "C", "c", 0.7f),
                new LuceneVectorService.SearchResult("4", "D", "d", 0.6f)));
        when(articleMapper.findSummaryByIds(anyList())).thenReturn(List.of(
                summary(1L, "a"), summary(2L, "b"), summary(3L, "c")));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("java")), Map.of());
        String text = lastUserText(advisor().before(request, chain));

        assertTrue(text.contains("《A》") && text.contains("《C》"));
        assertFalse(text.contains("《D》"));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ArticleRetrievalAdvisorTest`
Expected: 编译失败（ArticleRetrievalAdvisor 不存在）

- [ ] **Step 3: 实现 ArticleContextAdvisor（先建，RAG 测试依赖其常量）**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ArticleContextService;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 「当前文章」上下文注入 Advisor（order 300，链最内层）。
 *
 * <p>文章详情页提问时前端传 articleId，本 advisor 把文章全文区块
 * 前置到最后一条用户消息。加载失败返回空区块（沿用 ArticleContextService 降级行为）。</p>
 */
@Component
public class ArticleContextAdvisor implements BaseAdvisor {

    /** advisor 参数键：用户正在阅读的文章 ID（前端经 ChatRequest 传入） */
    public static final String ARTICLE_ID_PARAM = "articleId";

    private final ArticleContextService articleContextService;

    public ArticleContextAdvisor(ArticleContextService articleContextService) {
        this.articleContextService = articleContextService;
    }

    @Override
    public String getName() {
        return "ArticleContextAdvisor";
    }

    @Override
    public int getOrder() {
        return 300;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        Long articleId = asLong(request.context().get(ARTICLE_ID_PARAM));
        if (articleId == null) {
            return request;
        }
        Optional<String> block = articleContextService.buildArticleContext(articleId);
        return block.map(b -> AdvisorMessages.prependToLastUserMessage(request, b + "\n\n"))
                .orElse(request);
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        return response;
    }

    private Long asLong(Object value) {
        if (value instanceof Long l) {
            return l;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return null;
    }
}
```

- [ ] **Step 4: 实现共享工具类 AdvisorMessages**

创建 `backend/src/main/java/com/sean/blog/module/ai/advisor/AdvisorMessages.java`：

```java
package com.sean.blog.module.ai.advisor;

import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.ArrayList;
import java.util.List;

/** Advisor 共用的消息增强工具。 */
final class AdvisorMessages {

    private AdvisorMessages() {}

    /**
     * 把区块前置到请求中最后一条用户消息的文本前，返回新请求（原请求不可变）。
     */
    static ChatClientRequest prependToLastUserMessage(ChatClientRequest request, String block) {
        List<Message> messages = new ArrayList<>(request.prompt().getInstructions());
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).getMessageType() == MessageType.USER) {
                messages.set(i, new UserMessage(block + messages.get(i).getText()));
                break;
            }
        }
        Prompt prompt = request.prompt().mutate().messages(messages).build();
        return new ChatClientRequest(prompt, request.context());
    }
}
```

- [ ] **Step 5: 实现 ArticleRetrievalAdvisor**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.LuceneVectorService;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 全站 RAG 注入 Advisor（order 200）。
 *
 * <p>每轮提问向量检索相关文章，剔除当前文章后取前 N 条，
 * 按 ID 批量查库补齐 slug（供模型调用 getArticleBySlug 取全文），
 * 格式化为「---相关文章---」区块前置到用户消息。</p>
 *
 * <p>检索失败或无结果时返回未修改的请求（降级为纯聊天）。</p>
 */
@Component
public class ArticleRetrievalAdvisor implements BaseAdvisor {

    private static final Logger log = LoggerFactory.getLogger(ArticleRetrievalAdvisor.class);

    private final ArticleVectorService articleVectorService;
    private final ArticleMapper articleMapper;
    private final ChatProperties chatProperties;

    public ArticleRetrievalAdvisor(ArticleVectorService articleVectorService,
                                   ArticleMapper articleMapper,
                                   ChatProperties chatProperties) {
        this.articleVectorService = articleVectorService;
        this.articleMapper = articleMapper;
        this.chatProperties = chatProperties;
    }

    @Override
    public String getName() {
        return "ArticleRetrievalAdvisor";
    }

    @Override
    public int getOrder() {
        return 200;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        String query = lastUserText(request);
        if (query == null || query.isBlank()) {
            return request;
        }
        try {
            Long excludeId = asLong(request.context().get(ArticleContextAdvisor.ARTICLE_ID_PARAM));

            List<LuceneVectorService.SearchResult> results =
                    articleVectorService.search(query, chatProperties.getRag().getFetchSize());

            if (excludeId != null) {
                String exclude = String.valueOf(excludeId);
                results = results.stream()
                        .filter(r -> !exclude.equals(r.id()))
                        .collect(Collectors.toList());
            }
            results = results.stream()
                    .limit(chatProperties.getRag().getKeepSize())
                    .collect(Collectors.toList());

            if (results.isEmpty()) {
                return request;
            }

            Map<Long, String> slugById = loadSlugs(results);

            String context = results.stream()
                    .map(r -> formatEntry(r, slugById.get(parseId(r.id()))))
                    .collect(Collectors.joining("\n\n"));

            String block = "以下是全站检索到的与问题相关的博客文章，请参考这些内容回答。" +
                    "如果内容不相关，请忽略并正常回答。\n\n---相关文章---\n" + context + "\n---文章结束---";

            return AdvisorMessages.prependToLastUserMessage(request, block + "\n\n");
        } catch (Exception e) {
            log.warn("RAG retrieval failed, falling back to direct chat: {}", e.getMessage());
            return request;
        }
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        return response;
    }

    private Map<Long, String> loadSlugs(List<LuceneVectorService.SearchResult> results) {
        List<Long> ids = results.stream()
                .map(r -> parseId(r.id()))
                .filter(id -> id != null)
                .collect(Collectors.toList());
        if (ids.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> slugById = new HashMap<>();
        for (Article a : articleMapper.findSummaryByIds(ids)) {
            slugById.put(a.getId(), a.getSlug());
        }
        return slugById;
    }

    private String formatEntry(LuceneVectorService.SearchResult r, String slug) {
        String content = r.content() != null && !r.content().isEmpty() ? r.content() : "(无摘要)";
        String slugLine = slug != null ? "\nslug: " + slug : "";
        return String.format("### 《%s》%s\n%s", r.title(), slugLine, content);
    }

    private Long parseId(String id) {
        try {
            return Long.parseLong(id);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private Long asLong(Object value) {
        if (value instanceof Long l) {
            return l;
        }
        if (value instanceof Number n) {
            return n.longValue();
        }
        return null;
    }

    private String lastUserText(ChatClientRequest request) {
        var messages = request.prompt().getInstructions();
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).getMessageType() == MessageType.USER) {
                return messages.get(i).getText();
            }
        }
        return null;
    }
}
```

- [ ] **Step 6: 运行 RAG advisor 测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ArticleRetrievalAdvisorTest`
Expected: PASS（5 个测试）

- [ ] **Step 7: 写 ArticleContextAdvisor 测试并运行**

```java
package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ArticleContextService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleContextAdvisorTest {

    @Mock
    private ArticleContextService articleContextService;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ArticleContextAdvisor advisor() {
        return new ArticleContextAdvisor(articleContextService);
    }

    private String lastUserText(ChatClientRequest request) {
        List<Message> messages = request.prompt().getInstructions();
        return messages.get(messages.size() - 1).getText();
    }

    @Test
    void injectsArticleBlock() {
        when(articleContextService.buildArticleContext(5L))
                .thenReturn(Optional.of("---当前文章---\n《测试》\n正文\n---当前文章结束---"));

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("这篇文章讲了什么？")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 5L));

        String text = lastUserText(advisor().before(request, chain));

        assertTrue(text.startsWith("---当前文章---"));
        assertTrue(text.endsWith("这篇文章讲了什么？"));
    }

    @Test
    void noArticleIdReturnsSameRequest() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")), Map.of());
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void emptyBlockReturnsSameRequest() {
        when(articleContextService.buildArticleContext(5L)).thenReturn(Optional.empty());

        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")),
                Map.of(ArticleContextAdvisor.ARTICLE_ID_PARAM, 5L));
        assertSame(request, advisor().before(request, chain));
    }

    @Test
    void orderIs300() {
        assertEquals(300, advisor().getOrder());
    }
}
```

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ArticleContextAdvisorTest`
Expected: PASS（4 个测试）

- [ ] **Step 8: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleRetrievalAdvisor.java \
        backend/src/main/java/com/sean/blog/module/ai/advisor/ArticleContextAdvisor.java \
        backend/src/main/java/com/sean/blog/module/ai/advisor/AdvisorMessages.java \
        backend/src/test/java/com/sean/blog/module/ai/advisor/ArticleRetrievalAdvisorTest.java \
        backend/src/test/java/com/sean/blog/module/ai/advisor/ArticleContextAdvisorTest.java
git commit -m "feat(ai): RAG 注入与当前文章注入 Advisor（含 slug 补齐）"
```

---

### Task 7: Function Call 工具（4 类 8 个）+ system-prompt 工具规范

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/tool/ArticleTools.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/tool/ArticleToolsTest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/tool/ProjectTools.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/tool/ProjectToolsTest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/tool/SkillTools.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/tool/SkillToolsTest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/tool/ContactTools.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/tool/ContactToolsTest.java`
- Modify: `backend/src/main/resources/prompt/system-prompt.md`

**Interfaces:**
- Consumes: `ArticleMapper.findBySlug/findPublished`（现有）、`ProjectService.findPublished()`（现有）、`FileBundleService.listPublished()/getTree(Long)/getFileContent(Long, String)`（现有）、`ContactService.recordResume(String ip, String company, String email)/recordSubscribe(String ip, String email)`（Task 2）
- Produces: 四个 `@Component` 工具类，共 8 个 `@Tool` 方法；ToolContext 键 `"ip"`（Controller 经 `.toolContext(Map.of("ip", ip))` 注入）

- [ ] **Step 1: 写 ArticleTools 失败测试**

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleToolsTest {

    @Mock
    private ArticleMapper articleMapper;

    @InjectMocks
    private ArticleTools tools;

    private Article article(String slug, String status, String content) {
        Article a = new Article();
        a.setSlug(slug);
        a.setStatus(status);
        a.setTitle("标题");
        a.setContentMd(content);
        a.setExcerpt("摘要");
        a.setPublishDate(LocalDate.of(2026, 7, 1));
        return a;
    }

    @Test
    void getArticleBySlugReturnsContent() {
        when(articleMapper.findBySlug("java-1")).thenReturn(article("java-1", "PUBLISHED", "正文"));
        String result = tools.getArticleBySlug("java-1");
        assertTrue(result.contains("《标题》"));
        assertTrue(result.contains("正文"));
    }

    @Test
    void getArticleBySlugRejectsUnpublished() {
        when(articleMapper.findBySlug("draft-1")).thenReturn(article("draft-1", "DRAFT", "正文"));
        assertTrue(tools.getArticleBySlug("draft-1").contains("未找到"));
    }

    @Test
    void getArticleBySlugTruncatesLongContent() {
        String longContent = "x".repeat(9000);
        when(articleMapper.findBySlug("long-1")).thenReturn(article("long-1", "PUBLISHED", longContent));
        String result = tools.getArticleBySlug("long-1");
        assertTrue(result.contains("已截断"));
        assertFalse(result.contains("x".repeat(8001)));
    }

    @Test
    void listRecentArticlesFormats() {
        when(articleMapper.findPublished(anyMap())).thenReturn(List.of(article("java-1", "PUBLISHED", "正文")));
        String result = tools.listRecentArticles(null);
        assertTrue(result.contains("《标题》"));
        assertTrue(result.contains("java-1"));
        assertTrue(result.contains("摘要"));
    }

    @Test
    void listRecentArticlesClampsCount() {
        when(articleMapper.findPublished(anyMap())).thenReturn(List.of());
        String result = tools.listRecentArticles(99);
        assertTrue(result.contains("暂无"));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ArticleToolsTest`
Expected: 编译失败（ArticleTools 不存在）

- [ ] **Step 3: 实现 ArticleTools**

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 文章类工具：按 slug 取全文、列出最近文章。
 */
@Component
public class ArticleTools {

    /** 工具返回的文章正文上限 */
    private static final int MAX_CONTENT_LENGTH = 8000;

    private final ArticleMapper articleMapper;

    public ArticleTools(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    @Tool(name = "getArticleBySlug",
            description = "根据 slug 获取博客文章的完整内容。slug 来自 listRecentArticles 或相关问题中的相关文章列表。")
    public String getArticleBySlug(@ToolParam(description = "文章 slug") String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null || !"PUBLISHED".equals(article.getStatus())) {
            return "未找到 slug 为「" + slug + "」的已发布文章。";
        }
        String body = article.getContentMd() == null ? "" : article.getContentMd();
        if (body.length() > MAX_CONTENT_LENGTH) {
            body = body.substring(0, MAX_CONTENT_LENGTH) + "\n…（正文过长已截断）";
        }
        return String.format("《%s》\n%s", article.getTitle(), body);
    }

    @Tool(name = "listRecentArticles",
            description = "列出最近发布的博客文章，返回标题、slug、摘要和发布日期。用户问「有哪些文章」「最近写了什么」时使用。")
    public String listRecentArticles(
            @ToolParam(description = "返回数量，默认 5，最多 10", required = false) Integer count) {
        int n = (count == null || count <= 0) ? 5 : Math.min(count, 10);
        List<Article> articles = articleMapper.findPublished(Map.of("offset", 0, "size", n));
        if (articles.isEmpty()) {
            return "暂无已发布文章。";
        }
        return articles.stream()
                .map(a -> String.format("- 《%s》(slug: %s, 发布于 %s)\n  %s",
                        a.getTitle(), a.getSlug(), a.getPublishDate(),
                        a.getExcerpt() == null ? "" : a.getExcerpt()))
                .collect(Collectors.joining("\n"));
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ArticleToolsTest`
Expected: PASS（5 个测试）

- [ ] **Step 5: 写 ProjectTools 测试并实现**

测试 `backend/src/test/java/com/sean/blog/module/ai/tool/ProjectToolsTest.java`：

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectToolsTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private ProjectTools tools;

    @Test
    void listsProjects() {
        Project p = new Project();
        p.setTitle("博客系统");
        p.setDescription("个人博客");
        p.setTags("Java,Spring Boot");
        p.setUrl("https://fpfos.com");
        when(projectService.findPublished()).thenReturn(List.of(p));

        String result = tools.listProjects();

        assertTrue(result.contains("博客系统"));
        assertTrue(result.contains("Java,Spring Boot"));
        assertTrue(result.contains("https://fpfos.com"));
    }

    @Test
    void emptyList() {
        when(projectService.findPublished()).thenReturn(List.of());
        assertTrue(tools.listProjects().contains("暂无"));
    }
}
```

实现 `backend/src/main/java/com/sean/blog/module/ai/tool/ProjectTools.java`：

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 项目类工具：列出 Sean 的已发布项目。
 */
@Component
public class ProjectTools {

    private final ProjectService projectService;

    public ProjectTools(ProjectService projectService) {
        this.projectService = projectService;
    }

    @Tool(name = "listProjects",
            description = "列出 Sean 的个人项目，返回名称、描述、技术栈和链接。用户问「有哪些项目」「做过什么」时使用。")
    public String listProjects() {
        List<Project> projects = projectService.findPublished();
        if (projects.isEmpty()) {
            return "暂无已发布项目。";
        }
        return projects.stream()
                .map(p -> String.format("- 《%s》\n  描述：%s\n  技术栈：%s\n  链接：%s%s",
                        p.getTitle(),
                        p.getDescription() == null ? "" : p.getDescription(),
                        p.getTags() == null ? "" : p.getTags(),
                        p.getUrl() == null ? "" : p.getUrl(),
                        p.getGithubUrl() == null ? "" : "\n  GitHub：" + p.getGithubUrl()))
                .collect(Collectors.joining("\n"));
    }
}
```

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ProjectToolsTest`
Expected: PASS（2 个测试）

- [ ] **Step 6: 写 SkillTools 测试并实现**

测试 `backend/src/test/java/com/sean/blog/module/ai/tool/SkillToolsTest.java`：

```java
package com.sean.blog.module.ai.tool;

import tools.jackson.databind.ObjectMapper;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.service.FileBundleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SkillToolsTest {

    @Mock
    private FileBundleService fileBundleService;

    private SkillTools tools;

    @BeforeEach
    void setUp() {
        tools = new SkillTools(fileBundleService, new ObjectMapper());
    }

    @Test
    void listsBundles() {
        FileBundle b = new FileBundle();
        b.setId(1L);
        b.setName("Spring AI 入门");
        b.setDescription("技能包");
        b.setType("SKILL");
        when(fileBundleService.listPublished()).thenReturn(List.of(b));

        String result = tools.listSkillBundles();

        assertTrue(result.contains("Spring AI 入门"));
        assertTrue(result.contains("id: 1"));
    }

    @Test
    void fileTreeSerializes() {
        FileTreeResponse tree = new FileTreeResponse();
        tree.setBundleId(1L);
        tree.setBundleName("包");
        tree.setTree(List.of());
        when(fileBundleService.getTree(1L)).thenReturn(tree);

        String result = tools.getSkillFileTree(1L);

        assertTrue(result.contains("包"));
    }

    @Test
    void readsFileWithTruncation() throws IOException {
        when(fileBundleService.getFileContent(1L, "a.md")).thenReturn("y".repeat(12000));

        String result = tools.readSkillFile(1L, "a.md");

        assertTrue(result.contains("已截断"));
    }

    @Test
    void readFailureReturnsMessage() throws IOException {
        when(fileBundleService.getFileContent(1L, "bad.md")).thenThrow(new IOException("not found"));

        String result = tools.readSkillFile(1L, "bad.md");

        assertTrue(result.contains("读取失败"));
    }
}
```

实现 `backend/src/main/java/com/sean/blog/module/ai/tool/SkillTools.java`：

```java
package com.sean.blog.module.ai.tool;

import tools.jackson.databind.ObjectMapper;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Skill 文件库工具：列出 Bundle、查看文件树、读取文件内容。
 */
@Component
public class SkillTools {

    /** 工具返回的文件内容上限 */
    private static final int MAX_FILE_CONTENT_LENGTH = 10000;

    private final FileBundleService fileBundleService;
    private final ObjectMapper objectMapper;

    public SkillTools(FileBundleService fileBundleService, ObjectMapper objectMapper) {
        this.fileBundleService = fileBundleService;
        this.objectMapper = objectMapper;
    }

    @Tool(name = "listSkillBundles",
            description = "列出已发布的 Skill 文件包（id、名称、描述、类型）。用户问「有哪些 Skill」「技能包」时使用。")
    public String listSkillBundles() {
        List<FileBundle> bundles = fileBundleService.listPublished();
        if (bundles.isEmpty()) {
            return "暂无已发布的 Skill 文件包。";
        }
        return bundles.stream()
                .map(b -> String.format("- 《%s》(id: %d, 类型: %s)\n  %s",
                        b.getName(), b.getId(),
                        b.getType() == null ? "" : b.getType(),
                        b.getDescription() == null ? "" : b.getDescription()))
                .collect(Collectors.joining("\n"));
    }

    @Tool(name = "getSkillFileTree",
            description = "获取指定 Skill 文件包的文件树结构（JSON）。先用 listSkillBundles 取得 bundleId。")
    public String getSkillFileTree(@ToolParam(description = "Skill 文件包 ID") Long bundleId) {
        try {
            FileTreeResponse tree = fileBundleService.getTree(bundleId);
            return objectMapper.writeValueAsString(tree);
        } catch (RuntimeException e) {
            return "获取文件树失败：" + e.getMessage();
        }
    }

    @Tool(name = "readSkillFile",
            description = "读取 Skill 文件包内指定路径的文件内容（超过 10000 字符截断）。路径来自 getSkillFileTree。")
    public String readSkillFile(@ToolParam(description = "Skill 文件包 ID") Long bundleId,
                                @ToolParam(description = "文件路径，如 docs/guide.md") String filePath) {
        try {
            String content = fileBundleService.getFileContent(bundleId, filePath);
            if (content.length() > MAX_FILE_CONTENT_LENGTH) {
                content = content.substring(0, MAX_FILE_CONTENT_LENGTH) + "\n…（内容过长已截断）";
            }
            return content;
        } catch (Exception e) {
            return "读取失败：" + e.getMessage();
        }
    }
}
```

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=SkillToolsTest`
Expected: PASS（4 个测试）

- [ ] **Step 7: 写 ContactTools 测试并实现**

测试 `backend/src/test/java/com/sean/blog/module/ai/tool/ContactToolsTest.java`：

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.contact.service.ContactService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.model.ToolContext;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class ContactToolsTest {

    @Mock
    private ContactService contactService;

    @InjectMocks
    private ContactTools tools;

    private ToolContext contextWithIp(String ip) {
        return new ToolContext(Map.of("ip", ip));
    }

    @Test
    void requestResumeRecordsWithSessionIp() {
        String result = tools.requestResume("a@b.com", "Acme", contextWithIp("1.2.3.4"));

        assertTrue(result.contains("已登记"));
        verify(contactService).recordResume("1.2.3.4", "Acme", "a@b.com");
    }

    @Test
    void requestResumeRejectsBadEmail() {
        String result = tools.requestResume("not-an-email", null, contextWithIp("1.2.3.4"));

        assertTrue(result.contains("邮箱格式不正确"));
        verify(contactService, never()).recordResume(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.any(), org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void subscribeRecords() {
        String result = tools.subscribeEmail("a@b.com", contextWithIp("1.2.3.4"));

        assertTrue(result.contains("已登记"));
        verify(contactService).recordSubscribe("1.2.3.4", "a@b.com");
    }

    @Test
    void subscribeRejectsBadEmail() {
        assertTrue(tools.subscribeEmail("bad", contextWithIp("1.2.3.4")).contains("邮箱格式不正确"));
    }
}
```

实现 `backend/src/main/java/com/sean/blog/module/ai/tool/ContactTools.java`：

```java
package com.sean.blog.module.ai.tool;

import com.sean.blog.module.contact.service.ContactService;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * 联系方式登记工具：简历请求、邮件订阅。
 *
 * <p>写类工具——system prompt 约束模型仅在用户明确给出邮箱后调用；
 * 工具内再做一道邮箱格式校验兜底。IP 取自 ToolContext 中
 * Controller 注入的会话 IP（键 "ip"）。</p>
 */
@Component
public class ContactTools {

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");

    private final ContactService contactService;

    public ContactTools(ContactService contactService) {
        this.contactService = contactService;
    }

    @Tool(name = "requestResume",
            description = "登记简历获取请求，Sean 会通过邮件发送简历。仅当用户明确提供了邮箱地址时才调用。")
    public String requestResume(
            @ToolParam(description = "用户邮箱地址") String email,
            @ToolParam(description = "公司名称，用户未提供则传 null", required = false) String companyName,
            ToolContext toolContext) {
        String emailError = validateEmail(email);
        if (emailError != null) {
            return emailError;
        }
        try {
            contactService.recordResume(ip(toolContext), companyName, email.trim());
            return "已登记简历请求，Sean 会尽快通过邮件发送简历。";
        } catch (Exception e) {
            return "登记失败，请稍后重试或直接在「关于我」页面提交。";
        }
    }

    @Tool(name = "subscribeEmail",
            description = "登记邮件订阅。仅当用户明确表示要订阅并提供了邮箱时才调用。")
    public String subscribeEmail(@ToolParam(description = "用户邮箱地址") String email,
                                 ToolContext toolContext) {
        String emailError = validateEmail(email);
        if (emailError != null) {
            return emailError;
        }
        try {
            contactService.recordSubscribe(ip(toolContext), email.trim());
            return "已登记订阅，后续有新文章会通过邮件通知您。";
        } catch (Exception e) {
            return "登记失败，请稍后重试。";
        }
    }

    private String validateEmail(String email) {
        if (email == null || !EMAIL_PATTERN.matcher(email.trim()).matches()) {
            return "邮箱格式不正确：" + email + "。请提供有效的邮箱地址。";
        }
        return null;
    }

    private String ip(ToolContext toolContext) {
        Object ip = toolContext.getContext().get("ip");
        return ip instanceof String s ? s : "";
    }
}
```

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ContactToolsTest`
Expected: PASS（4 个测试）

- [ ] **Step 8: system-prompt.md 追加工具规范**

在 `backend/src/main/resources/prompt/system-prompt.md` 末尾追加：

```markdown

## 可用工具
您可以调用以下工具获取站内实时信息：
- listRecentArticles / getArticleBySlug：查询博客文章。回答「有哪些文章」「某篇文章讲什么」时使用；引用文章时附链接，格式为 /blog/{slug}
- listProjects：查询 Sean 的项目。回答「有哪些项目」「做过什么」时使用
- listSkillBundles / getSkillFileTree / readSkillFile：查询 Skill 文件库内容

工具使用纪律：
- requestResume 和 subscribeEmail 是写入操作：只有当用户在对话中明确提供了邮箱地址时才调用，不要在用户仅表达兴趣时就调用
- 消息中已包含「当前文章」「相关文章」区块时，优先使用区块内容回答，不必再调用文章查询工具
- 查询类工具按需调用，不要每轮都调用
```

- [ ] **Step 9: 全量测试 + 提交**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest='ArticleToolsTest,ProjectToolsTest,SkillToolsTest,ContactToolsTest'`
Expected: PASS（15 个测试）

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/tool/ \
        backend/src/test/java/com/sean/blog/module/ai/tool/ \
        backend/src/main/resources/prompt/system-prompt.md
git commit -m "feat(ai): Function Call 站点工具（文章/项目/Skill/联系）+ 提示词工具规范"
```

---

### Task 8: AiConfig 组装 + ChatController 重构 + 契约变更

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/config/AiConfig.java`
- Modify: `backend/src/main/java/com/sean/blog/config/WebMvcConfig.java`
- Modify: `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java`
- Modify: `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java`（整体重写）
- Delete: `backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java`
- Delete: `backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java`
- Delete: `backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java`
- Create: `backend/src/test/java/com/sean/blog/module/ai/controller/ChatControllerTest.java`

**Interfaces:**
- Consumes: Task 1–7 全部产物
- Produces: `ChatClient` Bean（defaultSystem + 5 层 advisor + 4 工具类）；`ChatMemory` Bean；`ChatMemoryRepository` Bean；API 契约 `{message, conversationId?, articleId?}` + 响应头 `X-Conversation-Id`

- [ ] **Step 1: 扩展 AiConfig**

在 `AiConfig.java` 现有 `embeddingModel` Bean 之外追加（并给类加 `@EnableConfigurationProperties(ChatProperties.class)`）：

```java
    @Bean
    public ChatMemoryRepository chatMemoryRepository(StringRedisTemplate redisTemplate,
                                                     ObjectMapper objectMapper,
                                                     ChatProperties chatProperties) {
        return new SpringRedisChatMemoryRepository(
                redisTemplate, objectMapper, chatProperties.getMemoryTtl(), "chat:memory:");
    }

    @Bean
    public ChatMemory chatMemory(ChatMemoryRepository chatMemoryRepository,
                                 ChatProperties chatProperties) {
        return new ResilientChatMemory(MessageWindowChatMemory.builder()
                .chatMemoryRepository(chatMemoryRepository)
                .maxMessages(chatProperties.getMemoryWindow())
                .build());
    }

    @Bean
    public ChatClient chatClient(ChatClient.Builder builder,
                                 ChatMemory chatMemory,
                                 ConversationPersistenceAdvisor conversationPersistenceAdvisor,
                                 ArticleRetrievalAdvisor articleRetrievalAdvisor,
                                 ArticleContextAdvisor articleContextAdvisor,
                                 ArticleTools articleTools,
                                 ProjectTools projectTools,
                                 SkillTools skillTools,
                                 ContactTools contactTools) {
        return builder
                .defaultSystem(new ClassPathResource("prompt/system-prompt.md"), StandardCharsets.UTF_8)
                .defaultAdvisors(
                        conversationPersistenceAdvisor,        // order 0
                        new SimpleLoggerAdvisor(50),           // order 50
                        MessageChatMemoryAdvisor.builder(chatMemory).order(100).build(),
                        articleRetrievalAdvisor,               // order 200
                        articleContextAdvisor)                 // order 300
                .defaultTools(articleTools, projectTools, skillTools, contactTools)
                .build();
    }
```

需要的新 import：

```java
import tools.jackson.databind.ObjectMapper;
import com.sean.blog.module.ai.advisor.ArticleContextAdvisor;
import com.sean.blog.module.ai.advisor.ArticleRetrievalAdvisor;
import com.sean.blog.module.ai.advisor.ConversationPersistenceAdvisor;
import com.sean.blog.module.ai.config.ChatProperties;
import com.sean.blog.module.ai.memory.ResilientChatMemory;
import com.sean.blog.module.ai.memory.SpringRedisChatMemoryRepository;
import com.sean.blog.module.ai.tool.ArticleTools;
import com.sean.blog.module.ai.tool.ContactTools;
import com.sean.blog.module.ai.tool.ProjectTools;
import com.sean.blog.module.ai.tool.SkillTools;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.SimpleLoggerAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.memory.MessageWindowChatMemory;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.nio.charset.StandardCharsets;
```

类注解改为：

```java
@Configuration
@EnableConfigurationProperties(ChatProperties.class)
public class AiConfig {
```

- [ ] **Step 2: WebMvcConfig 暴露响应头**

修改 `WebMvcConfig.addCorsMappings` 中的链式调用，在 `.allowedHeaders("*")` 之后、`.allowCredentials(true)` 之前插入一行：

```java
                .exposedHeaders("X-Conversation-Id")
```

- [ ] **Step 3: 新 ChatRequest 契约**

整体替换 `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java`：

```java
package com.sean.blog.module.ai.dto;

/**
 * AI 聊天请求体（POST /api/v1/ai/chat）。
 *
 * @param message        用户当前输入（必填，非空）
 * @param conversationId 会话 ID（可选；首次不传由后端生成并经响应头返回，后续请求携带）
 * @param articleId      用户正在阅读的文章 ID（可选，来自文章详情页）
 */
public record ChatRequest(String message, String conversationId, Long articleId) {}
```

- [ ] **Step 4: 写 ChatController 失败测试（conversationId 解析逻辑）**

```java
package com.sean.blog.module.ai.controller;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class ChatControllerTest {

    @Test
    void nullConversationIdGeneratesUuid() {
        String cid = ChatController.resolveConversationId(null);
        assertDoesNotThrow(() -> UUID.fromString(cid));
    }

    @Test
    void validConversationIdKept() {
        String uuid = UUID.randomUUID().toString();
        assertEquals(uuid, ChatController.resolveConversationId(uuid));
        assertEquals(uuid, ChatController.resolveConversationId("  " + uuid + " "));
    }

    @Test
    void invalidConversationIdRegenerated() {
        String cid = ChatController.resolveConversationId("not-a-uuid");
        assertDoesNotThrow(() -> UUID.fromString(cid));
    }
}
```

- [ ] **Step 5: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q test -Dtest=ChatControllerTest`
Expected: 编译失败（resolveConversationId 不存在）

- [ ] **Step 6: 整体重写 ChatController**

整体替换 `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java`：

```java
package com.sean.blog.module.ai.controller;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.ClientIpResolver;
import com.sean.blog.module.ai.advisor.ArticleContextAdvisor;
import com.sean.blog.module.ai.advisor.ConversationPersistenceAdvisor;
import com.sean.blog.module.ai.dto.ChatRequest;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Flux;

import java.util.Map;
import java.util.UUID;

/**
 * AI 客服聊天接口（SSE 流式）。
 *
 * <p>瘦控制器：仅做参数校验、会话 ID 解析、IP/UA 元数据捕获，
 * 对话增强逻辑全部在 Advisor 链（见 AiConfig）中完成。</p>
 */
@RestController
@RequestMapping("/api/v1/ai")
public class ChatController {

    private final ChatClient chatClient;
    private final ClientIpResolver clientIpResolver;

    public ChatController(ChatClient chatClient, ClientIpResolver clientIpResolver) {
        this.chatClient = chatClient;
        this.clientIpResolver = clientIpResolver;
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chat(@RequestBody ChatRequest request,
                             HttpServletRequest httpRequest,
                             HttpServletResponse httpResponse) {
        if (request.message() == null || request.message().isBlank()) {
            throw new BusinessException("消息不能为空");
        }

        String conversationId = resolveConversationId(request.conversationId());
        httpResponse.setHeader("X-Conversation-Id", conversationId);

        String ip = clientIpResolver.resolve(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        if (userAgent == null) {
            userAgent = "";
        }

        return chatClient.prompt()
                .user(request.message().trim())
                .advisors(a -> a
                        .param(ChatMemory.CONVERSATION_ID, conversationId)
                        .param(ArticleContextAdvisor.ARTICLE_ID_PARAM, request.articleId())
                        .param(ConversationPersistenceAdvisor.IP_KEY, ip)
                        .param(ConversationPersistenceAdvisor.USER_AGENT_KEY, userAgent))
                .toolContext(Map.of("ip", ip == null ? "" : ip))
                .stream()
                .content()
                .doOnCancel(() -> { /* 客户端主动断开，Reactor 正常取消订阅 */ });
    }

    /**
     * 解析会话 ID：null / 非法 UUID 形式 → 生成新 UUID。
     */
    static String resolveConversationId(String raw) {
        if (raw == null || raw.isBlank()) {
            return UUID.randomUUID().toString();
        }
        String trimmed = raw.trim();
        try {
            UUID.fromString(trimmed);
            return trimmed;
        } catch (IllegalArgumentException e) {
            return UUID.randomUUID().toString();
        }
    }
}
```

注意：`request.articleId()` 为 null 时 `advisors param` 值为 null 是允许的（advisor 侧 `asLong(null)` 返回 null 跳过）；userAgent 防 null 是因为 advisor 参数经 Map 传播，空值比 null 安全。

- [ ] **Step 7: 删除弃用的 history 相关代码**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git rm backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java \
       backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java \
       backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java
```

- [ ] **Step 8: 编译 + 全量后端测试**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q clean test`
Expected: BUILD 成功，全部测试 PASS（含既有 ArticleServiceFindPublishedByIdTest、ArticleContextServiceTest）

- [ ] **Step 9: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/config/AiConfig.java \
        backend/src/main/java/com/sean/blog/config/WebMvcConfig.java \
        backend/src/main/java/com/sean/blog/module/ai/ \
        backend/src/test/java/com/sean/blog/module/ai/
git commit -m "feat(ai): ChatClient Advisor 链 + Function Call 组装，ChatController 瘦身，弃用前端 history"
```

---

### Task 9: 前端适配（route.ts 透传头 + ChatProvider 会话管理 + 新对话按钮）

**Files:**
- Modify: `frontend/src/app/api/v1/ai/chat/route.ts`
- Modify: `frontend/src/components/chat/ChatProvider.tsx`
- Modify: `frontend/src/components/chat/ChatPanel.tsx`

**Interfaces:**
- Consumes: 后端新契约（Task 8）
- Produces: 前端 conversationId 生命周期管理（sessionStorage），ChatContext 新增 `resetConversation`

- [ ] **Step 1: route.ts 透传 X-Conversation-Id**

修改 `frontend/src/app/api/v1/ai/chat/route.ts` 的成功返回部分：

```ts
  // 流式透传：把后端的 ReadableStream 直接交给浏览器
  const conversationId = backendResponse.headers.get('x-conversation-id');
  return new Response(backendResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 告诉 nginx 这个响应不要缓冲
      ...(conversationId ? { 'X-Conversation-Id': conversationId } : {}),
    },
  });
```

- [ ] **Step 2: ChatProvider 会话管理**

修改 `frontend/src/components/chat/ChatProvider.tsx`：

1. 在 `Helpers` 区块（`nextId` 附近）新增会话 ID 存取函数：

```tsx
const CONVERSATION_ID_KEY = 'sean-ai-conversation-id';

function loadConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem(CONVERSATION_ID_KEY);
  } catch {
    return null;
  }
}

function saveConversationId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.sessionStorage.setItem(CONVERSATION_ID_KEY, id);
    } else {
      window.sessionStorage.removeItem(CONVERSATION_ID_KEY);
    }
  } catch {
    // sessionStorage 不可用时静默降级（每次都是新会话）
  }
}
```

2. `ChatContextValue` 接口新增成员：

```tsx
  resetConversation: () => void;
```

3. Provider 内新增状态（与 `abortRef` 相邻）：

```tsx
  const [conversationId, setConversationId] = useState<string | null>(loadConversationId);
```

4. 新增 `resetConversation`（与 `closeChat` 相邻）：

```tsx
  /** 新对话：中断流、清空消息与会话 ID（不关闭面板） */
  const resetConversation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
    setConversationId(null);
    saveConversationId(null);
    setMessages([buildWelcomeMessage(articleContext)]);
  }, [articleContext]);
```

5. `closeChat` 内追加清空会话（在 `setMessages(...)` 之前）：

```tsx
    setConversationId(null);
    saveConversationId(null);
```

6. `sendMessage` 中：

- 删除「3. 构建历史」整块（`const history = messages...` 共 5 行）
- 请求体改为：

```tsx
        body: JSON.stringify({
          message: trimmed,
          conversationId,
          articleId: articleContext ? articleContext.id : null,
        }),
```

- 在 `if (!response.ok)` 判断之前（拿到 response 之后）插入会话 ID 保存：

```tsx
      // 保存后端返回的会话 ID（首次请求时生成，后续请求携带以保持多轮记忆）
      const cid = response.headers.get('X-Conversation-Id');
      if (cid) {
        setConversationId(cid);
        saveConversationId(cid);
      }
```

- `sendMessage` 的依赖数组改为 `[isStreaming, articleContext, conversationId]`（移除 `messages`）

7. Provider value 追加 `resetConversation`：

```tsx
      value={{ messages, isOpen, isMinimized, isStreaming, articleContext, setArticleContext, openChat, closeChat, minimizeChat, resetConversation, sendMessage, stopStreaming }}
```

- [ ] **Step 3: ChatPanel 新对话按钮**

修改 `frontend/src/components/chat/ChatPanel.tsx`：

1. 从 useChat 解构 `resetConversation`：

```tsx
  const { isOpen, isMinimized, closeChat, minimizeChat, resetConversation } = useChat();
```

2. 移动端头部（`返回` 按钮所在行）把占位 `<div className="w-14" />` 替换为：

```tsx
          <button
            onClick={resetConversation}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10"
            aria-label="新对话"
            title="新对话"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
```

3. 桌面端头部：在最小化按钮之前（`<button onClick={(e) => { e.stopPropagation(); minimizeChat(); }}` 之前）插入同款按钮（`onMouseDown` 阻止拖动冒泡）：

```tsx
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); resetConversation(); }}
              className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/10"
              aria-label="新对话"
              title="新对话"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
```

- [ ] **Step 4: 前端构建验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run build 2>&1 | tail -15`
Expected: 构建成功（无 TypeScript 错误）

注意：若 3000 端口被旧 dev 进程占用，构建不受影响；dev 调试时回退 3001 端口。

- [ ] **Step 5: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/app/api/v1/ai/chat/route.ts \
        frontend/src/components/chat/ChatProvider.tsx \
        frontend/src/components/chat/ChatPanel.tsx
git commit -m "feat(frontend): 聊天会话 ID 管理（服务端记忆），新对话按钮，透传会话头"
```

---

### Task 10: 全栈集成验证

**Files:** 无代码改动（纯验证）

- [ ] **Step 1: 后端全量测试 + 前端构建**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn -q clean test`
Expected: 全部 PASS

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run build 2>&1 | tail -5`
Expected: 构建成功

- [ ] **Step 2: 启动全栈（Docker Compose，含 Flyway 建表）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
docker compose up -d --build
docker compose logs -f backend 2>&1 | grep -m1 -E "Started BlogApplication|APPLICATION FAILED"
```
Expected: `Started BlogApplication`；无 Flyway 报错

- [ ] **Step 3: 验收 1 —— 首轮请求拿到会话 ID**

```bash
curl -sS -i -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"你好，介绍一下 Sean"}' 2>&1 | grep -i "x-conversation-id"
```
Expected: 响应头包含 `X-Conversation-Id: <uuid>`，且 SSE 流正常输出

- [ ] **Step 4: 验收 2 —— 多轮记忆**

用上一步返回的 uuid 替换 `<CID>`，连发两轮：

```bash
CID=<上一步的 uuid>
curl -sS -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"我叫小明\",\"conversationId\":\"$CID\"}" > /dev/null
curl -sS -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d "{\"message\":\"我叫什么名字？\",\"conversationId\":\"$CID\"}"
```
Expected: 第二轮回答包含「小明」（Redis 记忆生效）

- [ ] **Step 5: 验收 3 —— 工具调用**

```bash
curl -sS -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"你有哪些项目？"}'
```
Expected: 回答列出站内真实项目（`listProjects` 工具被调用）

- [ ] **Step 6: 验收 4 —— 审计落库 + 元数据**

```bash
docker compose exec mysql mysql -uroot -p"${DB_PASSWORD:-}" sean_blog -e \
  "SELECT conversation_id, ip, LEFT(user_agent, 60) AS ua, message_count, created_at FROM ai_chat_session ORDER BY id DESC LIMIT 5;
   SELECT role, LEFT(content, 40) AS content FROM ai_chat_message ORDER BY id DESC LIMIT 6;"
```
Expected: session 行含真实 IP 与 UA、`message_count` 与消息行数一致；消息流水含 user/assistant 原文

- [ ] **Step 7: 验收 5 —— Redis 记忆与降级**

```bash
# 记忆键存在
docker compose exec redis redis-cli -a "${REDIS_PASSWORD:-devsecret}" --no-auth-warning KEYS 'chat:memory:*'
# 停 Redis 后聊天仍可用（降级为无记忆）
docker compose stop redis
curl -sS -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' -d '{"message":"还在吗？"}'
docker compose start redis
```
Expected: KEYS 有 `chat:memory:<uuid>`；停 Redis 后请求仍正常返回内容，backend 日志出现 `Chat memory ... failed` warn

- [ ] **Step 8: 验收 6 —— 浏览器端到端**

打开 `http://localhost:3000`，点开聊天面板：
1. 问 3 轮，确认多轮上下文保持
2. 点「新对话」按钮（桌面端头部刷新图标），确认消息清空、再提问时响应头会话 ID 已更换（DevTools Network 查看）
3. 打开任意文章详情页提问「这篇文章讲了什么」，确认基于当前文章回答

- [ ] **Step 9: 最终提交（如有验收中的微调）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git status
# 有改动则：git add -A && git commit -m "fix(ai): 集成验收修正"
```
