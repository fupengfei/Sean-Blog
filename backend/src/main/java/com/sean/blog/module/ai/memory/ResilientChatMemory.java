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
            log.warn("Chat memory add failed (conversationId={})", conversationId, e);
        }
    }

    @Override
    public List<Message> get(String conversationId) {
        try {
            return delegate.get(conversationId);
        } catch (Exception e) {
            log.warn("Chat memory get failed, returning empty history (conversationId={})",
                    conversationId, e);
            return List.of();
        }
    }

    @Override
    public void clear(String conversationId) {
        try {
            delegate.clear(conversationId);
        } catch (Exception e) {
            log.warn("Chat memory clear failed (conversationId={})", conversationId, e);
        }
    }
}
