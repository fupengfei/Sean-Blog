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
import static org.mockito.ArgumentMatchers.any;
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
