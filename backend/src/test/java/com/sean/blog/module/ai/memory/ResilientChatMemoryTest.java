package com.sean.blog.module.ai.memory;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ResilientChatMemoryTest {

    @Mock
    private ChatMemory delegate;

    @Test
    void delegatesHappyPath() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        List<Message> messages = List.of(new UserMessage("问"));
        when(delegate.get("cid")).thenReturn(messages);

        assertEquals(messages, memory.get("cid"));

        memory.add("cid", messages);
        verify(delegate).add("cid", messages);

        memory.clear("cid");
        verify(delegate).clear("cid");
    }

    @Test
    void getFailureReturnsEmpty() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        when(delegate.get("cid")).thenThrow(new RuntimeException("redis down"));

        assertTrue(memory.get("cid").isEmpty());
    }

    @Test
    void addFailureSwallowed() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        doThrow(new RuntimeException("redis down")).when(delegate).add(anyString(), anyList());

        // 不应抛出异常
        memory.add("cid", List.of(new UserMessage("问")));
    }

    @Test
    void clearFailureSwallowed() {
        ResilientChatMemory memory = new ResilientChatMemory(delegate);
        doThrow(new RuntimeException("redis down")).when(delegate).clear(anyString());

        memory.clear("cid");
    }
}
