package com.sean.blog.module.ai.controller;

import com.sean.blog.module.ai.service.ArticleVectorService;
import com.sean.blog.module.ai.service.LuceneVectorService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.util.StreamUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import reactor.core.publisher.Flux;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/ai")
public class ChatController {

    private static final Logger log = LoggerFactory.getLogger(ChatController.class);

    private final ChatClient chatClient;
    private final ArticleVectorService articleVectorService;

    public ChatController(ChatClient.Builder chatClientBuilder,
                          ArticleVectorService articleVectorService) {
        this.articleVectorService = articleVectorService;

        String systemPrompt;
        try {
            systemPrompt = StreamUtils.copyToString(
                    new ClassPathResource("prompt/system-prompt.md").getInputStream(),
                    StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new RuntimeException("Failed to load system prompt from prompt/system-prompt.md", e);
        }

        this.chatClient = chatClientBuilder
                .defaultSystem(systemPrompt)
                .build();
    }

    @GetMapping(value = "/chat", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<String> generation(String message) {

        // RAG: 向量检索相关文章，注入上下文
        String augmentedMessage = buildAugmentedMessage(message);

        return this.chatClient.prompt()
                .user(augmentedMessage)
                .stream()
                .content()
                .doOnCancel(() -> { /* 客户端主动断开，Reactor 正常取消订阅 */ });
    }

    /**
     * 向量检索 + 上下文注入：找到相关文章后拼接到用户消息中
     */
    private String buildAugmentedMessage(String userMessage) {
        try {
            List<LuceneVectorService.SearchResult> results = articleVectorService.search(userMessage, 3);

            if (results.isEmpty()) {
                return userMessage;
            }

            String context = results.stream()
                    .map(r -> String.format("### 《%s》\n%s", r.title(),
                            r.content() != null && !r.content().isEmpty()
                                    ? r.content()
                                    : "(无摘要)"))
                    .collect(Collectors.joining("\n\n"));

            log.debug("RAG injected {} articles for query: {}", results.size(),
                    userMessage.substring(0, Math.min(50, userMessage.length())));

            return String.format(
                    "以下是与用户问题相关的博客文章，请参考这些内容回答。如果内容不相关，请忽略并正常回答。\n\n" +
                    "---相关文章---\n%s\n---文章结束---\n\n" +
                    "用户问题：%s",
                    context, userMessage);

        } catch (Exception e) {
            log.warn("RAG retrieval failed, falling back to direct chat: {}", e.getMessage());
            return userMessage;
        }
    }
}
