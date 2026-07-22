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
