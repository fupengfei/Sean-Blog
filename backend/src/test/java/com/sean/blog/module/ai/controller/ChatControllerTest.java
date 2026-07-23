package com.sean.blog.module.ai.controller;

import org.junit.jupiter.api.Test;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

class ChatControllerTest {

    @Test
    void nullConversationIdGeneratesUuid() {
        String cid = ChatController.resolveConversationId(null);
        assertDoesNotThrow(() -> UUID.fromString(cid));
    }

    @Test
    void validConversationIdKept() {
        String uuid = UUID.randomUUID().toString();
        assertEquals(uuid, ChatController.resolveConversationId(uuid));
        assertEquals(uuid, ChatController.resolveConversationId("  " + uuid + " "));
    }

    @Test
    void invalidConversationIdRegenerated() {
        String cid = ChatController.resolveConversationId("not-a-uuid");
        assertDoesNotThrow(() -> UUID.fromString(cid));
    }
}
