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
