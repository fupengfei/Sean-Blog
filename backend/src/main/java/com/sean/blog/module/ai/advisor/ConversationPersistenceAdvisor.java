package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ChatPersistenceService;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
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
