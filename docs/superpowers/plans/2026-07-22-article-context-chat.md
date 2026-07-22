# 文章上下文感知 AI 助手 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在文章详情页打开 AI 助手时自动感知当前文章，用户问「这篇文章讲了什么」即基于该文章全文回答，并支持多轮追问。

**Architecture:** 文章详情页通过 ChatProvider 新增的 `setArticleContext` 注入 `{id, title}`；发消息时前端 POST `{message, articleId, history}` 到 `/api/v1/ai/chat`；后端按 articleId 加载已发布文章全文注入「当前文章」区块，保留全局向量 RAG（剔除当前文章去重），历史消息作为独立 user/assistant 消息传入 ChatClient；响应仍为 SSE 流。

**Tech Stack:** Spring Boot 4 / Spring AI ChatClient / MyBatis / JUnit 5 + Mockito（后端）；Next.js 14 / TypeScript / Tailwind（前端）

**Spec:** `docs/superpowers/specs/2026-07-22-article-context-chat-design.md`

## Global Constraints

- 所有异常路径「降级不中断」：文章加载失败、RAG 失败均退回纯聊天，绝不返回 5xx 中断对话
- SSE 响应格式与前端 SSE 解析逻辑（`reader.read()` 逐 chunk 拼接）完全不变
- 前端 `Article.id` 是 `string`（Long 精度保护）；后端 `ChatRequest.articleId` 是 `Long`，Jackson 自动将 JSON 数字字符串绑定为 Long
- UI 遵循 DESIGN.md：边框 `1px solid #E2E8F0`（Tailwind token `outline-variant`）、绿色 `#0a6c44`（token `secondary`）
- 文案全部中文
- v1 范围外（不做）：服务端会话存储、聊天历史持久化、按文章过滤向量检索
- 后端端口 8880（`application.yml`），聊天接口需要 `DEEPSEEK_API_KEY` 环境变量才能真正调通模型
- Commit message 风格：`feat(ai): 中文描述`

## File Structure

| 文件 | 变更 | 职责 |
|------|------|------|
| `backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java` | 修改 | 新增 `findPublishedById(Long)`：无浏览量副作用的已发布文章查询 |
| `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java` | 新增 | 聊天请求体 `{message, articleId, history}` |
| `backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java` | 新增 | 历史消息 `{role, content}` |
| `backend/src/main/java/com/sean/blog/module/ai/service/ArticleContextService.java` | 新增 | 按 articleId 构建「当前文章」区块（含截断/回退/降级） |
| `backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java` | 新增 | 历史消息后端兜底净化（纯函数） |
| `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java` | 重写 | GET→POST、消息列表组装、RAG 去重 |
| `backend/src/main/resources/prompt/system-prompt.md` | 修改 | 新增「如何使用当前文章」一节 |
| `backend/src/test/java/com/sean/blog/module/blog/service/ArticleServiceFindPublishedByIdTest.java` | 新增 | Task 1 单测 |
| `backend/src/test/java/com/sean/blog/module/ai/service/ArticleContextServiceTest.java` | 新增 | Task 2 单测 |
| `backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java` | 新增 | Task 3 单测 |
| `frontend/src/components/chat/ChatProvider.tsx` | 修改 | articleContext 状态、POST、history、欢迎语函数 |
| `frontend/src/components/chat/ArticleContextChip.tsx` | 新增 | 面板头部文章上下文 chip |
| `frontend/src/components/chat/ChatPanel.tsx` | 修改 | 移动端/桌面端面板插入 chip |
| `frontend/src/components/chat/ChatInput.tsx` | 修改 | 动态 placeholder |
| `frontend/src/app/blog/[id]/page.tsx` | 修改 | 接线 `setArticleContext` |

---

### Task 1: ArticleService 新增无副作用的 findPublishedById

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java`（在 `getPublishedById` 方法后插入新方法）
- Test: `backend/src/test/java/com/sean/blog/module/blog/service/ArticleServiceFindPublishedByIdTest.java`

**Interfaces:**
- Consumes: `ArticleMapper.findPublishedById(Long id)`（已存在，Mapper XML 中按 `status = 'PUBLISHED'` 过滤，返回 `Article` 或 null）
- Produces: `ArticleService.findPublishedById(Long id): Article`（不存在/未发布返回 null，**不**调用 `incrementViewCount`）——Task 2 依赖此方法

- [ ] **Step 1: 写失败测试**

创建 `backend/src/test/java/com/sean/blog/module/blog/service/ArticleServiceFindPublishedByIdTest.java`：

```java
package com.sean.blog.module.blog.service;

import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import com.sean.blog.module.blog.mapper.ArticleRelatedMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleServiceFindPublishedByIdTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private ArticleRelatedMapper articleRelatedMapper;
    @Mock
    private SnowflakeIdGenerator idGenerator;

    private ArticleService service;

    @BeforeEach
    void setUp() {
        service = new ArticleService(articleMapper, articleRelatedMapper, idGenerator, "/tmp/articles");
    }

    @Test
    void returnsPublishedArticleWithoutIncrementingViews() {
        Article article = new Article();
        article.setId(1L);
        when(articleMapper.findPublishedById(1L)).thenReturn(article);

        Article result = service.findPublishedById(1L);

        assertSame(article, result);
        verify(articleMapper, never()).incrementViewCount(any());
    }

    @Test
    void returnsNullWhenNotFoundOrNotPublished() {
        when(articleMapper.findPublishedById(99L)).thenReturn(null);
        assertNull(service.findPublishedById(99L));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ArticleServiceFindPublishedByIdTest`
Expected: 编译失败，错误信息类似 `cannot find symbol: method findPublishedById(Long)`（ArticleService 上无此方法）

- [ ] **Step 3: 实现最小代码**

在 `ArticleService.java` 的 `getPublishedById(Long id)` 方法（约 283-290 行）**之后**插入：

```java
    /**
     * 根据 ID 查询已发布的文章（无副作用，不增加浏览次数）。
     *
     * <p>供 AI 模块内部加载文章内容使用；前台详情页展示请用 {@link #getPublishedById(Long)}（含浏览计数）。</p>
     *
     * @param id 文章 ID
     * @return 文章对象；不存在或未发布时返回 null
     */
    public Article findPublishedById(Long id) {
        return articleMapper.findPublishedById(id);
    }
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ArticleServiceFindPublishedByIdTest`
Expected: `Tests run: 2, Failures: 0, Errors: 0, Skipped: 0` + `BUILD SUCCESS`

- [ ] **Step 5: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java \
        backend/src/test/java/com/sean/blog/module/blog/service/ArticleServiceFindPublishedByIdTest.java
git commit -m "feat(blog): ArticleService 新增无浏览量副作用的 findPublishedById

供 AI 模块加载文章内容使用，避免聊天时误增浏览次数。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: ArticleContextService —— 构建「当前文章」区块

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/service/ArticleContextService.java`
- Test: `backend/src/test/java/com/sean/blog/module/ai/service/ArticleContextServiceTest.java`

**Interfaces:**
- Consumes: `ArticleService.findPublishedById(Long id): Article`（Task 1 产出）、`Article.getTitle()/getContentMd()/getExcerpt()`
- Produces: `ArticleContextService.buildArticleContext(Long articleId): Optional<String>`——Task 4 的 Controller 用它拿「当前文章」区块；区块格式固定为：

```
---当前文章---
《{title}》
{正文}
---当前文章结束---
```

规则：articleId 为 null/≤0 → empty；文章不存在 → empty；contentMd 空白时回退 excerpt，都空 → empty；正文超 30000 字符截断并追加 `\n…（内容过长已截断）`；任何异常 → empty（log.warn）。

- [ ] **Step 1: 写失败测试**

创建 `backend/src/test/java/com/sean/blog/module/ai/service/ArticleContextServiceTest.java`：

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleContextServiceTest {

    @Mock
    private ArticleService articleService;

    @InjectMocks
    private ArticleContextService service;

    private Article article(String title, String contentMd, String excerpt) {
        Article a = new Article();
        a.setTitle(title);
        a.setContentMd(contentMd);
        a.setExcerpt(excerpt);
        return a;
    }

    @Test
    void nullOrInvalidIdReturnsEmptyWithoutQuery() {
        assertEquals(Optional.empty(), service.buildArticleContext(null));
        assertEquals(Optional.empty(), service.buildArticleContext(0L));
        assertEquals(Optional.empty(), service.buildArticleContext(-1L));
        verifyNoInteractions(articleService);
    }

    @Test
    void notFoundReturnsEmpty() {
        when(articleService.findPublishedById(1L)).thenReturn(null);
        assertEquals(Optional.empty(), service.buildArticleContext(1L));
    }

    @Test
    void buildsBlockFromContentMd() {
        when(articleService.findPublishedById(1L))
                .thenReturn(article("测试文章", "# 标题\n正文内容", "摘要"));

        Optional<String> block = service.buildArticleContext(1L);

        assertTrue(block.isPresent());
        assertTrue(block.get().startsWith("---当前文章---"));
        assertTrue(block.get().contains("《测试文章》"));
        assertTrue(block.get().contains("# 标题\n正文内容"));
        assertTrue(block.get().endsWith("---当前文章结束---"));
    }

    @Test
    void fallsBackToExcerptWhenContentMdBlank() {
        when(articleService.findPublishedById(2L))
                .thenReturn(article("摘要文章", "   ", "这是摘要"));

        Optional<String> block = service.buildArticleContext(2L);

        assertTrue(block.isPresent());
        assertTrue(block.get().contains("这是摘要"));
    }

    @Test
    void emptyContentAndExcerptReturnsEmpty() {
        when(articleService.findPublishedById(3L)).thenReturn(article("空文章", "", ""));
        assertEquals(Optional.empty(), service.buildArticleContext(3L));
    }

    @Test
    void truncatesOverlongContent() {
        String longContent = "字".repeat(ArticleContextService.MAX_CONTENT_LENGTH + 100);
        when(articleService.findPublishedById(4L))
                .thenReturn(article("长文章", longContent, "摘要"));

        Optional<String> block = service.buildArticleContext(4L);

        assertTrue(block.isPresent());
        assertTrue(block.get().contains("…（内容过长已截断）"));
        assertFalse(block.get().contains("字".repeat(ArticleContextService.MAX_CONTENT_LENGTH + 1)));
    }

    @Test
    void swallowsExceptionsAndReturnsEmpty() {
        when(articleService.findPublishedById(5L)).thenThrow(new RuntimeException("db down"));
        assertEquals(Optional.empty(), service.buildArticleContext(5L));
    }
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ArticleContextServiceTest`
Expected: 编译失败，`cannot find symbol: class ArticleContextService`

- [ ] **Step 3: 实现最小代码**

创建 `backend/src/main/java/com/sean/blog/module/ai/service/ArticleContextService.java`：

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * ArticleContextService — 构建「当前文章」上下文区块。
 *
 * <p>供 AI 聊天在文章详情页感知用户正在阅读的文章：
 * 按 articleId 加载已发布文章全文，格式化为「---当前文章---」区块注入 prompt。</p>
 *
 * <p>所有异常路径都返回 {@link Optional#empty()}（降级不中断聊天）。</p>
 */
@Service
public class ArticleContextService {

    private static final Logger log = LoggerFactory.getLogger(ArticleContextService.class);

    /** 注入 prompt 的文章正文最大长度（字符数），超出截断 */
    static final int MAX_CONTENT_LENGTH = 30000;

    private final ArticleService articleService;

    public ArticleContextService(ArticleService articleService) {
        this.articleService = articleService;
    }

    /**
     * 构建「当前文章」区块。
     *
     * @param articleId 用户正在阅读的文章 ID（可为 null）
     * @return 区块文本；articleId 非法、文章不存在/未发布、内容为空或发生异常时返回 empty
     */
    public Optional<String> buildArticleContext(Long articleId) {
        if (articleId == null || articleId <= 0) {
            return Optional.empty();
        }
        try {
            Article article = articleService.findPublishedById(articleId);
            if (article == null) {
                log.warn("Article context skipped: article {} not found or not published", articleId);
                return Optional.empty();
            }

            String body = article.getContentMd();
            if (body == null || body.isBlank()) {
                body = article.getExcerpt();
            }
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }
            if (body.length() > MAX_CONTENT_LENGTH) {
                body = body.substring(0, MAX_CONTENT_LENGTH) + "\n…（内容过长已截断）";
            }

            return Optional.of(String.format("---当前文章---\n《%s》\n%s\n---当前文章结束---",
                    article.getTitle(), body));
        } catch (Exception e) {
            log.warn("Article context loading failed for id={}: {}", articleId, e.getMessage());
            return Optional.empty();
        }
    }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ArticleContextServiceTest`
Expected: `Tests run: 7, Failures: 0, Errors: 0, Skipped: 0` + `BUILD SUCCESS`

- [ ] **Step 5: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/service/ArticleContextService.java \
        backend/src/test/java/com/sean/blog/module/ai/service/ArticleContextServiceTest.java
git commit -m "feat(ai): 新增 ArticleContextService 构建当前文章上下文区块

按 articleId 加载已发布文章全文（超 30k 字符截断，contentMd 空时
回退 excerpt），任何异常降级为 empty，不阻断聊天。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: ChatRequest / ChatMessageDto DTO + ChatHistorySanitizer 净化

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java`
- Create: `backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java`
- Test: `backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java`

**Interfaces:**
- Produces:
  - `ChatRequest(String message, Long articleId, List<ChatMessageDto> history)`（record，Jackson 反序列化 POST body；articleId 接受 JSON 数字字符串 → Long）
  - `ChatMessageDto(String role, String content)`（record）
  - `ChatHistorySanitizer.sanitize(List<ChatMessageDto>): List<ChatMessageDto>`（静态纯函数，Task 4 使用）
- 净化规则：role 只认 `user`/`assistant`（其余条目连同 null 条目丢弃）→ 单条 content 截断至 4000 字符 → 只保留最近 10 条 → 总长超 8000 字符从最旧丢弃

- [ ] **Step 1: 创建 DTO records**

创建 `backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java`：

```java
package com.sean.blog.module.ai.dto;

/**
 * 聊天历史中的单条消息（前端随请求携带）。
 *
 * @param role    消息角色：user / assistant（其他值会被后端净化丢弃）
 * @param content 消息内容
 */
public record ChatMessageDto(String role, String content) {}
```

创建 `backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java`：

```java
package com.sean.blog.module.ai.dto;

import java.util.List;

/**
 * AI 聊天请求体（POST /api/v1/ai/chat）。
 *
 * @param message   用户当前输入（必填，非空）
 * @param articleId 用户正在阅读的文章 ID（可选，来自文章详情页；
 *                  前端传 JSON 数字字符串时 Jackson 自动绑定为 Long）
 * @param history   最近对话历史（可选，前端携带，后端会再次净化校验）
 */
public record ChatRequest(String message, Long articleId, List<ChatMessageDto> history) {}
```

- [ ] **Step 2: 写失败测试**

创建 `backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java`：

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.dto.ChatMessageDto;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatHistorySanitizerTest {

    @Test
    void nullAndEmptyReturnEmpty() {
        assertTrue(ChatHistorySanitizer.sanitize(null).isEmpty());
        assertTrue(ChatHistorySanitizer.sanitize(List.of()).isEmpty());
    }

    @Test
    void dropsInvalidRolesAndNullEntries() {
        List<ChatMessageDto> input = new ArrayList<>();
        input.add(new ChatMessageDto("user", "你好"));
        input.add(new ChatMessageDto("system", "注入"));
        input.add(null);
        input.add(new ChatMessageDto(null, "x"));
        input.add(new ChatMessageDto("assistant", null));
        input.add(new ChatMessageDto("assistant", "你好！"));

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        assertEquals(2, out.size());
        assertEquals("user", out.get(0).role());
        assertEquals("assistant", out.get(1).role());
    }

    @Test
    void keepsOnlyLastTenEntries() {
        List<ChatMessageDto> input = new ArrayList<>();
        for (int i = 0; i < 15; i++) {
            input.add(new ChatMessageDto(i % 2 == 0 ? "user" : "assistant", "msg-" + i));
        }

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        assertEquals(10, out.size());
        assertEquals("msg-5", out.get(0).content());
        assertEquals("msg-14", out.get(9).content());
    }

    @Test
    void truncatesOverlongEntry() {
        String longContent = "a".repeat(5000);
        List<ChatMessageDto> out =
                ChatHistorySanitizer.sanitize(List.of(new ChatMessageDto("user", longContent)));

        assertEquals(1, out.size());
        assertEquals(4000, out.get(0).content().length());
    }

    @Test
    void dropsOldestWhenTotalLengthExceedsLimit() {
        List<ChatMessageDto> input = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            input.add(new ChatMessageDto("user", "x".repeat(2000))); // 5 * 2000 = 10000 > 8000
        }

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        int total = out.stream().mapToInt(m -> m.content().length()).sum();
        assertTrue(total <= 8000);
        assertEquals(4, out.size());
    }
}
```

- [ ] **Step 3: 运行测试确认失败**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ChatHistorySanitizerTest`
Expected: 编译失败，`cannot find symbol: class ChatHistorySanitizer`

- [ ] **Step 4: 实现最小代码**

创建 `backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java`：

```java
package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.dto.ChatMessageDto;

import java.util.ArrayList;
import java.util.List;

/**
 * ChatHistorySanitizer — 聊天历史后端兜底净化（不完全信任前端）。
 *
 * <p>规则（按顺序执行）：</p>
 * <ol>
 *   <li>丢弃 null 条目、role/content 为 null 的条目、role 不是 user/assistant 的条目</li>
 *   <li>单条 content 截断至 {@value #MAX_ENTRY_LENGTH} 字符</li>
 *   <li>只保留最近 {@value #MAX_ENTRIES} 条</li>
 *   <li>总长超过 {@value #MAX_TOTAL_LENGTH} 字符时从最旧条目开始丢弃</li>
 * </ol>
 */
public final class ChatHistorySanitizer {

    static final int MAX_ENTRIES = 10;
    static final int MAX_ENTRY_LENGTH = 4000;
    static final int MAX_TOTAL_LENGTH = 8000;

    private ChatHistorySanitizer() {}

    /**
     * 净化前端传来的对话历史。
     *
     * @param history 原始历史（可为 null）
     * @return 净化后的历史列表（永不为 null）
     */
    public static List<ChatMessageDto> sanitize(List<ChatMessageDto> history) {
        if (history == null || history.isEmpty()) {
            return List.of();
        }

        List<ChatMessageDto> cleaned = new ArrayList<>();
        for (ChatMessageDto m : history) {
            if (m == null || m.role() == null || m.content() == null) {
                continue;
            }
            if (!"user".equals(m.role()) && !"assistant".equals(m.role())) {
                continue;
            }
            String content = m.content().length() > MAX_ENTRY_LENGTH
                    ? m.content().substring(0, MAX_ENTRY_LENGTH)
                    : m.content();
            cleaned.add(new ChatMessageDto(m.role(), content));
        }

        if (cleaned.size() > MAX_ENTRIES) {
            cleaned = new ArrayList<>(cleaned.subList(cleaned.size() - MAX_ENTRIES, cleaned.size()));
        }

        int total = cleaned.stream().mapToInt(m -> m.content().length()).sum();
        while (total > MAX_TOTAL_LENGTH && !cleaned.isEmpty()) {
            total -= cleaned.get(0).content().length();
            cleaned.remove(0);
        }

        return cleaned;
    }
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test -Dtest=ChatHistorySanitizerTest`
Expected: `Tests run: 5, Failures: 0, Errors: 0, Skipped: 0` + `BUILD SUCCESS`

- [ ] **Step 6: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/dto/ChatRequest.java \
        backend/src/main/java/com/sean/blog/module/ai/dto/ChatMessageDto.java \
        backend/src/main/java/com/sean/blog/module/ai/service/ChatHistorySanitizer.java \
        backend/src/test/java/com/sean/blog/module/ai/service/ChatHistorySanitizerTest.java
git commit -m "feat(ai): 新增聊天请求 DTO 与历史消息净化工具

ChatRequest 支持 message/articleId/history 三字段；
ChatHistorySanitizer 后端兜底：role 白名单、最近 10 条、
单条 4000 字符、总长 8000 字符上限。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: ChatController 重写（GET→POST + 上下文注入 + RAG 去重）

**Files:**
- Rewrite: `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java`

**Interfaces:**
- Consumes:
  - `ChatRequest` / `ChatMessageDto`（Task 3）
  - `ChatHistorySanitizer.sanitize(List<ChatMessageDto>): List<ChatMessageDto>`（Task 3）
  - `ArticleContextService.buildArticleContext(Long): Optional<String>`（Task 2）
  - `ArticleVectorService.search(String query, int k): List<LuceneVectorService.SearchResult>`（已有）；`SearchResult(String id, String title, String content, float score)`
  - `BusinessException(String message)`（默认 code 400，由 GlobalExceptionHandler 统一处理）
- Produces: `POST /api/v1/ai/chat`，`Content-Type: application/json` 请求 → `text/event-stream` SSE 响应（格式不变）

- [ ] **Step 1: 重写 ChatController**

用以下内容完整替换 `backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java`：

```java
package com.sean.blog.module.ai.controller;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.ai.dto.ChatMessageDto;
import com.sean.blog.module.ai.dto.ChatRequest;
import com.sean.blog.module.ai.service.ArticleContextService;
import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.ChatHistorySanitizer;
import com.sean.blog.module.ai.service.LuceneVectorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Flux;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    /** 向量检索取 4 条，剔除当前文章后最多保留 3 条 */
    private static final int RAG_FETCH_SIZE = 4;
    private static final int RAG_KEEP_SIZE = 3;

    private final ChatClient chatClient;
    private final ArticleVectorService articleVectorService;
    private final ArticleContextService articleContextService;
    private final String systemPrompt;

    public ChatController(ChatClient.Builder chatClientBuilder,
                          ArticleVectorService articleVectorService,
                          ArticleContextService articleContextService) {
        this.articleVectorService = articleVectorService;
        this.articleContextService = articleContextService;

        try {
            this.systemPrompt = StreamUtils.copyToString(
                    new ClassPathResource("prompt/system-prompt.md").getInputStream(),
                    StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load system prompt from prompt/system-prompt.md", e);
        }

        this.chatClient = chatClientBuilder.build();
    }

    @PostMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> chat(@RequestBody ChatRequest request) {
        if (request.message() == null || request.message().isBlank()) {
            throw new BusinessException("消息不能为空");
        }

        String message = request.message().trim();
        List<ChatMessageDto> history = ChatHistorySanitizer.sanitize(request.history());

        // 文章上下文：文章详情页打开时注入当前文章全文
        String articleBlock = articleContextService.buildArticleContext(request.articleId())
                .orElse(null);
        String augmentedMessage = buildAugmentedMessage(message, articleBlock, request.articleId());

        // 组装消息列表：system + 历史对话 + 当前问题
        List<Message> messages = new ArrayList<>();
        messages.add(new SystemMessage(systemPrompt));
        for (ChatMessageDto h : history) {
            if ("assistant".equals(h.role())) {
                messages.add(new AssistantMessage(h.content()));
            } else {
                messages.add(new UserMessage(h.content()));
            }
        }
        messages.add(new UserMessage(augmentedMessage));

        return this.chatClient.prompt()
                .messages(messages)
                .stream()
                .content()
                .doOnCancel(() -> { /* 客户端主动断开，Reactor 正常取消订阅 */ });
    }

    /**
     * 上下文注入：当前文章区块（若有）+ 全站 RAG 相关文章区块（若有）+ 用户问题。
     * 两个区块都不存在时返回原始用户消息（与旧行为一致）。
     */
    private String buildAugmentedMessage(String userMessage, String articleBlock, Long articleId) {
        String ragBlock = buildRagBlock(userMessage, articleId);

        if (articleBlock == null && ragBlock == null) {
            return userMessage;
        }

        StringBuilder sb = new StringBuilder();
        if (articleBlock != null) {
            sb.append(articleBlock).append("\n\n");
        }
        if (ragBlock != null) {
            sb.append(ragBlock).append("\n\n");
        }
        sb.append("用户问题：").append(userMessage);
        return sb.toString();
    }

    /**
     * 全站向量检索相关文章并格式化为区块；剔除当前文章避免与「当前文章」区块重复。
     * 检索失败或无结果时返回 null（降级不中断）。
     */
    private String buildRagBlock(String userMessage, Long articleId) {
        try {
            List<LuceneVectorService.SearchResult> results =
                    articleVectorService.search(userMessage, RAG_FETCH_SIZE);

            if (articleId != null) {
                String excludeId = String.valueOf(articleId);
                results = results.stream()
                        .filter(r -> !excludeId.equals(r.id()))
                        .collect(Collectors.toList());
            }
            results = results.stream().limit(RAG_KEEP_SIZE).collect(Collectors.toList());

            if (results.isEmpty()) {
                return null;
            }

            String context = results.stream()
                    .map(r -> String.format("### 《%s》\n%s", r.title(),
                            r.content() != null && !r.content().isEmpty()
                                    ? r.content()
                                    : "(无摘要)"))
                    .collect(Collectors.joining("\n\n"));

            log.debug("RAG injected {} articles for query: {}", results.size(),
                    userMessage.substring(0, Math.min(50, userMessage.length())));

            return "以下是全站检索到的与问题相关的博客文章，请参考这些内容回答。如果内容不相关，请忽略并正常回答。\n\n" +
                    "---相关文章---\n" + context + "\n---文章结束---";
        } catch (Exception e) {
            log.warn("RAG retrieval failed, falling back to direct chat: {}", e.getMessage());
            return null;
        }
    }
}
```

- [ ] **Step 2: 编译验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn clean compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 3: 运行全部已有单测确认无回归**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn test`
Expected: Task 1-3 的 14 个测试全部通过，`BUILD SUCCESS`

- [ ] **Step 4: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/java/com/sean/blog/module/ai/controller/ChatController.java
git commit -m "feat(ai): 聊天接口改为 POST，支持文章上下文与对话历史

POST /api/v1/ai/chat 接收 {message, articleId, history}：
- articleId 存在时注入当前文章全文区块
- history 净化后作为独立 user/assistant 消息传入
- 全站 RAG 保留，检索结果剔除当前文章去重
- 响应仍为 SSE 流，格式不变

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: system-prompt.md 扩充「当前文章」使用说明

**Files:**
- Modify: `backend/src/main/resources/prompt/system-prompt.md`

**Interfaces:**
- Consumes: Task 4 注入的「---当前文章---」区块格式
- Produces: 模型对「这篇文章/本文/这篇」指代词的解析规则

- [ ] **Step 1: 在「如何使用相关文章」一节之前插入新节**

在 `system-prompt.md` 中找到：

```markdown
## 如何使用「相关文章」
```

替换为：

```markdown
## 如何使用「当前文章」
用户消息中可能包含「---当前文章---」区块，这是访客正在阅读的文章全文。
- 当用户提到"这篇文章"、"本文"、"这篇"、"当前文章"等指代词时，指的就是区块中的文章，即使对话历史里出现过其他文章
- 回答关于当前文章的问题时，基于区块内的全文内容进行总结、解读和延伸
- 「当前文章」与「相关文章」同时存在时，涉及"这篇/本文"的问题优先使用当前文章区块
- 用户的问题与当前文章无关时，正常回答即可，不必强行关联

## 如何使用「相关文章」
```

- [ ] **Step 2: 编译验证（资源文件随包）**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn clean compile`
Expected: `BUILD SUCCESS`

- [ ] **Step 3: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add backend/src/main/resources/prompt/system-prompt.md
git commit -m "feat(ai): 系统提示词新增当前文章区块使用说明

指导模型将'这篇文章/本文/这篇'等指代词解析为当前文章区块，
与相关文章区块共存时指代性问题优先使用当前文章。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: ChatProvider 改造（articleContext 状态 + POST + history + 欢迎语）

**Files:**
- Modify: `frontend/src/components/chat/ChatProvider.tsx`

**Interfaces:**
- Consumes: 后端 `POST /api/v1/ai/chat`（Task 4），body `{message, articleId, history}`
- Produces:
  - `ArticleContext` 接口（`{id: string; title: string}`，id 为 string 对应前端 Article.id）
  - Context 新增字段：`articleContext: ArticleContext | null`、`setArticleContext: (ctx: ArticleContext | null) => void`——Task 7（chip/placeholder）与 Task 8（文章页接线）依赖
  - 欢迎语由 `buildWelcomeMessage(articleContext)` 生成；无真实对话时欢迎语随 articleContext 联动更新

以下 7 个 Edit 依次作用于 `frontend/src/components/chat/ChatProvider.tsx`。

- [ ] **Step 1: 新增 ArticleContext 类型并扩展 Context 接口**

Edit `frontend/src/components/chat/ChatProvider.tsx`：

old_string:
```ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isStreaming: boolean;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
}
```

new_string:
```ts
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

/** 用户正在阅读的文章上下文（id 为 string，对应前端 Article.id 的 Long 精度保护） */
export interface ArticleContext {
  id: string;
  title: string;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  isMinimized: boolean;
  isStreaming: boolean;
  articleContext: ArticleContext | null;
  setArticleContext: (ctx: ArticleContext | null) => void;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
}
```

- [ ] **Step 2: 欢迎语常量改为函数**

old_string:
```ts
const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 您好！我是 **Sean's AI 助手**，可以问我关于：
- Sean 的技术栈、专业领域和兴趣爱好
- 博客文章和项目推荐
- 前端 / 后端 / AI 相关技术问题

有什么可以帮您？`,
  timestamp: Date.now(),
};
```

new_string:
```ts
/** 根据文章上下文生成欢迎语：文章页显示文章版，其他页面显示通用版 */
function buildWelcomeMessage(articleContext: ArticleContext | null): ChatMessage {
  const content = articleContext
    ? `📖 你正在阅读 **《${articleContext.title}》**，可以问我任何关于这篇文章的问题，比如「这篇文章讲了什么？」

也可以继续问我关于 Sean 的技术栈、博客文章或技术问题。`
    : `👋 您好！我是 **Sean's AI 助手**，可以问我关于：
- Sean 的技术栈、专业领域和兴趣爱好
- 博客文章和项目推荐
- 前端 / 后端 / AI 相关技术问题

有什么可以帮您？`;
  return { id: 'welcome', role: 'assistant', content, timestamp: Date.now() };
}
```

- [ ] **Step 3: 新增 articleContext 状态**

old_string:
```ts
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
```

new_string:
```ts
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [buildWelcomeMessage(null)]);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [articleContext, setArticleContext] = useState<ArticleContext | null>(null);
  const abortRef = useRef<AbortController | null>(null);
```

- [ ] **Step 4: 欢迎语随文章上下文联动**

old_string:
```ts
  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);
```

new_string:
```ts
  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // 文章上下文变化时：若还没有真实对话，欢迎语联动更新；已有对话则不动（chip 已传达上下文）
  useEffect(() => {
    setMessages((prev) => {
      const hasConversation = prev.some((m) => m.id !== 'welcome');
      if (hasConversation) return prev;
      return [buildWelcomeMessage(articleContext)];
    });
  }, [articleContext]);
```

- [ ] **Step 5: closeChat 重置为当前欢迎语**

old_string:
```ts
  /** 关闭面板：中断流、清空对话（重置为欢迎语）、重置最小化 */
  const closeChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsMinimized(false);
    setIsStreaming(false);
    setMessages([WELCOME_MESSAGE]);
  }, []);
```

new_string:
```ts
  /** 关闭面板：中断流、清空对话（重置为欢迎语）、重置最小化 */
  const closeChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsMinimized(false);
    setIsStreaming(false);
    setMessages([buildWelcomeMessage(articleContext)]);
  }, [articleContext]);
```

- [ ] **Step 6: sendMessage 改为 POST 并携带 articleId + history**

old_string:
```ts
    // 3. Build URL — 直连后端避免 Next.js rewrite 代理缓冲 SSE 流
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const url = base
      ? `${base}/ai/chat?message=${encodeURIComponent(trimmed)}`
      : `/api/v1/ai/chat?message=${encodeURIComponent(trimmed)}`;

    // 4. Create AbortController
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, { signal: controller.signal });
```

new_string:
```ts
    // 3. 构建历史（发送前快照，剔除欢迎语）— 前端轻裁剪，后端兜底校验
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-10)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    // Build URL — 直连后端避免 Next.js rewrite 代理缓冲 SSE 流
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const url = base ? `${base}/ai/chat` : '/api/v1/ai/chat';

    // 4. Create AbortController
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          articleId: articleContext ? articleContext.id : null,
          history,
        }),
        signal: controller.signal,
      });
```

- [ ] **Step 7: 更新 sendMessage 依赖数组与 Context value**

old_string:
```ts
  }, [isStreaming]);
```

new_string:
```ts
  }, [isStreaming, messages, articleContext]);
```

old_string:
```ts
      value={{ messages, isOpen, isMinimized, isStreaming, openChat, closeChat, minimizeChat, sendMessage, stopStreaming }}
```

new_string:
```ts
      value={{ messages, isOpen, isMinimized, isStreaming, articleContext, setArticleContext, openChat, closeChat, minimizeChat, sendMessage, stopStreaming }}
```

- [ ] **Step 8: 类型检查**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npx tsc --noEmit`
Expected: 无输出（无类型错误）

- [ ] **Step 9: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/components/chat/ChatProvider.tsx
git commit -m "feat(chat): ChatProvider 支持文章上下文与对话历史

- 新增 articleContext 状态与 setArticleContext API
- 发送改为 POST，携带 articleId 与最近 10 条历史
- 欢迎语按文章上下文联动（无真实对话时更新）
- SSE 读取逻辑不变

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: ArticleContextChip 组件 + ChatPanel / ChatInput 接线

**Files:**
- Create: `frontend/src/components/chat/ArticleContextChip.tsx`
- Modify: `frontend/src/components/chat/ChatPanel.tsx`
- Modify: `frontend/src/components/chat/ChatInput.tsx`

**Interfaces:**
- Consumes: `useChat().articleContext`（Task 6 产出）
- Produces: 面板头部上下文 chip（`📖 《标题》`，点击跳转 `/blog/{id}`）+ 文章页动态 placeholder

- [ ] **Step 1: 创建 ArticleContextChip 组件**

创建 `frontend/src/components/chat/ArticleContextChip.tsx`：

```tsx
'use client';

import Link from 'next/link';
import { useChat } from './ChatProvider';

/**
 * ArticleContextChip — 聊天面板头部的文章上下文提示
 *
 * 仅当用户正在文章详情页（articleContext 存在）时渲染。
 * 样式遵循 DESIGN.md：1px 边框（outline-variant）、Green 辅色文字（secondary）。
 * 点击 chip 跳转到对应文章。
 */
export default function ArticleContextChip() {
  const { articleContext } = useChat();
  if (!articleContext) return null;

  return (
    <div className="px-4 py-2 border-b border-outline-variant/60 bg-surface-container-low shrink-0">
      <Link
        href={`/blog/${articleContext.id}`}
        title={articleContext.title}
        className="inline-flex items-center gap-1.5 max-w-full px-2.5 py-1 rounded-full border border-outline-variant bg-white text-secondary text-xs font-medium hover:bg-secondary-container/40 transition-colors"
      >
        <span className="flex-shrink-0">📖</span>
        <span className="truncate">《{articleContext.title}》</span>
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: ChatPanel 引入 chip**

Edit `frontend/src/components/chat/ChatPanel.tsx`：

old_string:
```ts
import MessageList from './MessageList';
import ChatInput from './ChatInput';
```

new_string:
```ts
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ArticleContextChip from './ArticleContextChip';
```

- [ ] **Step 3: 移动端面板插入 chip（header 与消息列表之间）**

Edit `frontend/src/components/chat/ChatPanel.tsx`：

old_string:
```tsx
        <MessageList />
        <ChatInput />
      </div>

      {/* ================================================================ */}
      {/* 桌面端浮动面板（可拖动 + 最小化）                                  */}
```

new_string:
```tsx
        <ArticleContextChip />
        <MessageList />
        <ChatInput />
      </div>

      {/* ================================================================ */}
      {/* 桌面端浮动面板（可拖动 + 最小化）                                  */}
```

- [ ] **Step 4: 桌面端面板插入 chip（header 与消息列表之间）**

Edit `frontend/src/components/chat/ChatPanel.tsx`：

old_string:
```tsx
        <MessageList />
        <ChatInput />
      </div>
    </>
  );
}
```

new_string:
```tsx
        <ArticleContextChip />
        <MessageList />
        <ChatInput />
      </div>
    </>
  );
}
```

- [ ] **Step 5: ChatInput 动态 placeholder**

Edit `frontend/src/components/chat/ChatInput.tsx`：

old_string:
```ts
  const { sendMessage, stopStreaming, isStreaming } = useChat();
```

new_string:
```ts
  const { sendMessage, stopStreaming, isStreaming, articleContext } = useChat();
```

old_string:
```ts
        placeholder={isStreaming ? 'AI 正在回复...' : '输入您的问题...'}
```

new_string:
```ts
        placeholder={
          isStreaming
            ? 'AI 正在回复...'
            : articleContext
              ? '问问关于这篇文章的问题...'
              : '输入您的问题...'
        }
```

- [ ] **Step 6: 类型检查**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npx tsc --noEmit`
Expected: 无输出

- [ ] **Step 7: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/components/chat/ArticleContextChip.tsx \
        frontend/src/components/chat/ChatPanel.tsx \
        frontend/src/components/chat/ChatInput.tsx
git commit -m "feat(chat): 面板显示当前文章上下文 chip 与动态占位符

- 新增 ArticleContextChip：头部下方显示 📖《标题》，点击跳转文章
- 移动端与桌面端面板均插入 chip
- 文章页输入框占位符变为「问问关于这篇文章的问题...」

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 8: 文章详情页接线 setArticleContext + 前端构建验证

**Files:**
- Modify: `frontend/src/app/blog/[id]/page.tsx`

**Interfaces:**
- Consumes: `useChat().setArticleContext`（Task 6 产出）、页面已有的 `article: Article | null` 状态（`article.id: string`、`article.title: string`）
- Produces: 进入文章页 → 全局 chat 获得文章上下文；离开 → cleanup 清除

- [ ] **Step 1: 引入 useChat**

Edit `frontend/src/app/blog/[id]/page.tsx`：

old_string:
```ts
import { getArticleById, getNextArticle, getPrerequisiteArticle, getRelatedArticles } from '@/lib/api';
```

new_string:
```ts
import { getArticleById, getNextArticle, getPrerequisiteArticle, getRelatedArticles } from '@/lib/api';
import { useChat } from '@/components/chat/ChatProvider';
```

- [ ] **Step 2: 组件内获取 setArticleContext**

old_string:
```ts
export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
```

new_string:
```ts
export default function ArticleDetailPage() {
  const params = useParams();
  const articleId = params.id as string;
  const { setArticleContext } = useChat();

  const [article, setArticle] = useState<Article | null>(null);
```

- [ ] **Step 3: 新增文章上下文同步 effect**

old_string:
```ts
  }, [articleId]);

  // ------------------------------------------------------------------
  // States: loading / error
  // ------------------------------------------------------------------
```

new_string:
```ts
  }, [articleId]);

  // 将当前文章同步给全局 AI 助手（文章上下文感知）；离开文章页时清除
  useEffect(() => {
    if (article) {
      setArticleContext({ id: article.id, title: article.title });
    }
    return () => setArticleContext(null);
  }, [article, setArticleContext]);

  // ------------------------------------------------------------------
  // States: loading / error
  // ------------------------------------------------------------------
```

- [ ] **Step 4: 类型检查**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npx tsc --noEmit`
Expected: 无输出

- [ ] **Step 5: 生产构建验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run build`
Expected: `✓ Compiled successfully`，`/blog/[id]` 路由出现在产物列表中，exit 0

- [ ] **Step 6: 提交**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/app/blog/\[id\]/page.tsx
git commit -m "feat(blog): 文章详情页向 AI 助手同步当前文章上下文

文章加载完成后 setArticleContext({id, title})，离开页面 cleanup
清除；切换文章时 effect 重跑，上下文自动跟随新文章，对话保留。

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 9: 端到端验证（后端接口 + 页面行为）

**Files:** 无代码变更（发现问题时修复并追加提交）

**Interfaces:**
- Consumes: 全部前序任务产出
- Produces: spec 验证方案逐项通过的确认

**前置条件：** 设置 `DEEPSEEK_API_KEY` 环境变量（聊天需要真实调用模型）。本地开发可分别启动：`cd backend && mvn spring-boot:run`（需 MySQL/Redis 在 localhost 运行）与 `cd frontend && npm run dev`；或用 `docker compose up -d --build`（需在 compose 中配置 DEEPSEEK_API_KEY）。

- [ ] **Step 1: 后端整体编译 + 全部单测**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/backend && mvn clean compile && mvn test`
Expected: `BUILD SUCCESS`，14 个单测全部通过

- [ ] **Step 2: 接口冒烟 —— 无 articleId（兼容旧行为）**

先查一个真实已发布文章 ID（MySQL：`SELECT id, title FROM t_article WHERE status='PUBLISHED' LIMIT 3;`），然后：

Run:
```bash
curl -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"你好，介绍一下 Sean"}'
```
Expected: SSE 流正常返回介绍内容（`data:` 分块），无 500

- [ ] **Step 3: 接口冒烟 —— 携带 articleId**

Run（替换 `<ARTICLE_ID>` 为 Step 2 查到的真实 ID）:
```bash
curl -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"这篇文章讲了什么","articleId":"<ARTICLE_ID>","history":[]}'
```
Expected: 回答内容确实总结了 `<ARTICLE_ID>` 对应的文章（与文章标题/内容吻合）

- [ ] **Step 4: 接口冒烟 —— 非法 articleId 降级**

Run:
```bash
curl -N -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"这篇文章讲了什么","articleId":"999999999"}'
```
Expected: 正常返回（模型坦诚说明或按全局知识回答），无 500；后端日志可见 `Article context skipped: article 999999999 not found or not published`

- [ ] **Step 5: 接口冒烟 —— 空消息返回 400**

Run:
```bash
curl -i -X POST http://localhost:8880/api/v1/ai/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"  "}'
```
Expected: HTTP 400，body 为统一 `Result` 错误结构，message 为「消息不能为空」

- [ ] **Step 6: 页面行为手动验证清单**

启动前端（`npm run dev`）后浏览器逐项确认。**若用 `docker compose up -d --build` 部署验证，浏览器经 Nginx(80) → Next.js → 后端 的完整链路发聊天气泡正常流式输出，即同时覆盖了 Nginx 对 POST SSE 的转发（spec 边界情况之一）；若用本地 dev 直连验证，此 Nginx 项留待部署时确认。**

1. 打开某篇文章 `/blog/<id>` → 点开右下角「Sean's AI 助手」→ 欢迎语为「📖 你正在阅读《xxx》…」，header 下方出现 `📖《xxx》` chip，输入框占位符为「问问关于这篇文章的问题...」
2. 问「这篇文章讲了什么」→ 流式回答正确总结当前文章
3. 紧接着问「展开讲讲第三部分」（或类似指代性追问）→ 回答衔接上文，指代解析正确
4. 点「下一篇」/前置文章链接切到另一篇文章 → chip 更新为新文章标题，对话历史保留；再问「这篇文章讲了什么」→ 指向新文章
5. 回首页 `/` → 重开聊天：chip 消失、欢迎语恢复通用版、占位符恢复「输入您的问题...」，提问通用问题正常
6. 文章页关闭面板后重新打开 → 欢迎语仍为文章版

- [ ] **Step 7: 发现问题则修复并补提交；全部通过后无需额外提交**

若任一验证项失败：定位修复 → 回到对应任务的重验证步骤（单测 / tsc / build）→ 以 `fix(ai): 中文描述` 提交修复。
