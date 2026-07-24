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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
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
    void userTurnUpsertsSessionAndInsertsMessageWhenAbsent() {
        // 模拟 upsert 后查询返回的持久化会话（首次创建场景）
        AiChatSession persisted = new AiChatSession();
        persisted.setId(100L);
        persisted.setConversationId("cid-1");
        when(sessionMapper.findByConversationId("cid-1")).thenReturn(persisted);

        service.persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");

        // 验证原子 upsert 被调用
        ArgumentCaptor<AiChatSession> sessionCaptor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).upsert(sessionCaptor.capture());
        AiChatSession session = sessionCaptor.getValue();
        assertEquals("cid-1", session.getConversationId());
        assertEquals("1.2.3.4", session.getIp());
        assertEquals("UA", session.getUserAgent());
        assertEquals(0, session.getMessageCount());

        // 验证消息写入和计数递增加
        ArgumentCaptor<AiChatMessage> msgCaptor = ArgumentCaptor.forClass(AiChatMessage.class);
        verify(messageMapper).insert(msgCaptor.capture());
        assertEquals("user", msgCaptor.getValue().getRole());
        assertEquals("你好", msgCaptor.getValue().getContent());
        assertEquals(Long.valueOf(100L), msgCaptor.getValue().getSessionId());
        verify(sessionMapper).incrementMessageCount(100L, 1);
    }

    @Test
    void userTurnUpsertsWhenSessionExists() {
        // 已有会话：upsert 处理冲突，查询返回已有 ID
        AiChatSession persisted = new AiChatSession();
        persisted.setId(99L);
        persisted.setConversationId("cid-1");
        when(sessionMapper.findByConversationId("cid-1")).thenReturn(persisted);

        service.persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");

        // upsert 总是被调用，updateLastActive 不再直接调用
        verify(sessionMapper).upsert(any());
        verify(sessionMapper, never()).updateLastActive(any(), any());
        verify(messageMapper).insert(any());
        verify(sessionMapper).incrementMessageCount(99L, 1);
    }

    @Test
    void assistantTurnUpsertsAndInsertsMessage() {
        AiChatSession persisted = new AiChatSession();
        persisted.setId(200L);
        persisted.setConversationId("cid-2");
        when(sessionMapper.findByConversationId("cid-2")).thenReturn(persisted);

        service.persistAssistantTurn("cid-2", "回答");

        ArgumentCaptor<AiChatSession> sessionCaptor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).upsert(sessionCaptor.capture());
        assertEquals("cid-2", sessionCaptor.getValue().getConversationId());

        ArgumentCaptor<AiChatMessage> msgCaptor = ArgumentCaptor.forClass(AiChatMessage.class);
        verify(messageMapper).insert(msgCaptor.capture());
        assertEquals("assistant", msgCaptor.getValue().getRole());
        assertEquals("回答", msgCaptor.getValue().getContent());
    }

    @Test
    void userAgentTruncatedTo512() {
        AiChatSession persisted = new AiChatSession();
        persisted.setId(300L);
        persisted.setConversationId("cid-3");
        when(sessionMapper.findByConversationId("cid-3")).thenReturn(persisted);
        String longUa = "x".repeat(600);

        service.persistUserTurn("cid-3", "1.1.1.1", longUa, "hi");

        ArgumentCaptor<AiChatSession> captor = ArgumentCaptor.forClass(AiChatSession.class);
        verify(sessionMapper).upsert(captor.capture());
        assertEquals(512, captor.getValue().getUserAgent().length());
    }

    @Test
    void dbFailureSwallowed() {
        org.mockito.Mockito.doThrow(new RuntimeException("db down"))
                .when(sessionMapper).upsert(any());

        // 不应抛出异常
        service.persistUserTurn("cid-4", "1.1.1.1", "UA", "hi");

        verify(messageMapper, never()).insert(any());
    }
}
