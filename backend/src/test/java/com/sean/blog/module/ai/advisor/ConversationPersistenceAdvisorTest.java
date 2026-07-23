package com.sean.blog.module.ai.advisor;

import com.sean.blog.module.ai.service.ChatPersistenceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.Prompt;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class ConversationPersistenceAdvisorTest {

    @Mock
    private ChatPersistenceService persistenceService;

    private final AdvisorChain chain = mock(AdvisorChain.class);

    private ConversationPersistenceAdvisor advisor() {
        return new ConversationPersistenceAdvisor(persistenceService);
    }

    @Test
    void orderIsZero() {
        assertEquals(0, advisor().getOrder());
    }

    @Test
    void beforePersistsUserTurn() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1",
                        ConversationPersistenceAdvisor.IP_KEY, "1.2.3.4",
                        ConversationPersistenceAdvisor.USER_AGENT_KEY, "UA"));

        ChatClientRequest out = advisor().before(request, chain);

        assertSame(request, out);
        verify(persistenceService).persistUserTurn("cid-1", "1.2.3.4", "UA", "你好");
    }

    @Test
    void afterPersistsAssistantTurn() {
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(List.of(new Generation(new AssistantMessage("回答")))),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1"));

        ChatClientResponse out = advisor().after(response, chain);

        assertSame(response, out);
        verify(persistenceService).persistAssistantTurn("cid-1", "回答");
    }

    @Test
    void skipsWhenNoConversationId() {
        ChatClientRequest request = new ChatClientRequest(
                new Prompt(new UserMessage("你好")), Map.of());
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(List.of(new Generation(new AssistantMessage("回答")))), Map.of());

        advisor().before(request, chain);
        advisor().after(response, chain);

        verifyNoInteractions(persistenceService);
    }

    @Test
    void afterSkipsBlankAssistantText() {
        ChatClientResponse response = new ChatClientResponse(
                new ChatResponse(List.of(new Generation(new AssistantMessage("   ")))),
                Map.of(ChatMemory.CONVERSATION_ID, "cid-1"));

        advisor().after(response, chain);

        verifyNoInteractions(persistenceService);
    }
}
