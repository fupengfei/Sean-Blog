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
        String rawUserAgent = httpRequest.getHeader("User-Agent");
        final String userAgent = rawUserAgent == null ? "" : rawUserAgent;

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
