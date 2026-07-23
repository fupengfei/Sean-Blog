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
 * <p>注意：因 Spring AI 2.0.0 流式工具调用缺陷，当前使用非流式调用（SSE 单事件返回）。</p>
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

        // 非流式调用（.call()）：Spring AI 2.0.0 流式聚合存在 tool_calls 丢失缺陷
        // （DeepSeek 工具调用的第二轮请求 assistant 消息缺 tool_calls → 400），
        // 经实验证实与思考模式无关，为框架自身 bug。改用同步调用，
        // 响应仍以 SSE 单事件返回，前端无需改动。待 Spring AI 修复后可改回 .stream().content()。
        String content = chatClient.prompt()
                .user(request.message().trim())
                .advisors(a -> {
                    a.param(ChatMemory.CONVERSATION_ID, conversationId);
                    if (request.articleId() != null) {
                        a.param(ArticleContextAdvisor.ARTICLE_ID_PARAM, request.articleId());
                    }
                    a.param(ConversationPersistenceAdvisor.IP_KEY, ip == null ? "" : ip);
                    a.param(ConversationPersistenceAdvisor.USER_AGENT_KEY, userAgent);
                })
                .toolContext(Map.of("ip", ip == null ? "" : ip))
                .call()
                .content();
        return Flux.just(content == null ? "" : content);
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
