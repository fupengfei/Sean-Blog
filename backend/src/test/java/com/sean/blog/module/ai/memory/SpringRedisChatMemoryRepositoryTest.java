package com.sean.blog.module.ai.memory;

import tools.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.MessageType;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpringRedisChatMemoryRepositoryTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    private ListOperations<String, String> listOps;
    private SpringRedisChatMemoryRepository repository;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        listOps = mock(ListOperations.class);
        lenient().when(redisTemplate.opsForList()).thenReturn(listOps);
        repository = new SpringRedisChatMemoryRepository(
                redisTemplate, new ObjectMapper(), Duration.ofDays(7), "chat:memory:");
    }

    @Test
    void saveAllDeletesThenPushesAndExpires() {
        List<Message> messages = List.of(new UserMessage("问"), new AssistantMessage("答"));

        repository.saveAll("cid-1", messages);

        verify(redisTemplate).delete("chat:memory:cid-1");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(listOps).rightPushAll(eq("chat:memory:cid-1"), captor.capture());
        assertEquals(2, captor.getValue().size());
        assertTrue(captor.getValue().iterator().next().contains("\"type\":\"USER\""));
        verify(redisTemplate).expire("chat:memory:cid-1", Duration.ofDays(7));
    }

    @Test
    void findByConversationIdDeserializesBackToTypedMessages() {
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"问\"}",
                "{\"type\":\"ASSISTANT\",\"text\":\"答\"}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(2, messages.size());
        assertEquals(MessageType.USER, messages.get(0).getMessageType());
        assertEquals("问", messages.get(0).getText());
        assertEquals(MessageType.ASSISTANT, messages.get(1).getMessageType());
        assertEquals("答", messages.get(1).getText());
    }

    @Test
    void findByConversationIdReturnsEmptyWhenNoKey() {
        when(listOps.range("chat:memory:cid-x", 0, -1)).thenReturn(null);
        assertTrue(repository.findByConversationId("cid-x").isEmpty());
    }

    @Test
    void deleteRemovesKey() {
        repository.deleteByConversationId("cid-1");
        verify(redisTemplate).delete("chat:memory:cid-1");
    }

    @Test
    void findConversationIdsUnsupportedEmpty() {
        assertTrue(repository.findConversationIds().isEmpty());
    }
}
