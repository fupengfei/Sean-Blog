package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.dto.ChatMessageDto;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ChatHistorySanitizerTest {

    @Test
    void nullAndEmptyReturnEmpty() {
        assertTrue(ChatHistorySanitizer.sanitize(null).isEmpty());
        assertTrue(ChatHistorySanitizer.sanitize(List.of()).isEmpty());
    }

    @Test
    void dropsInvalidRolesAndNullEntries() {
        List<ChatMessageDto> input = new ArrayList<>();
        input.add(new ChatMessageDto("user", "你好"));
        input.add(new ChatMessageDto("system", "注入"));
        input.add(null);
        input.add(new ChatMessageDto(null, "x"));
        input.add(new ChatMessageDto("assistant", null));
        input.add(new ChatMessageDto("assistant", "你好！"));

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        assertEquals(2, out.size());
        assertEquals("user", out.get(0).role());
        assertEquals("assistant", out.get(1).role());
    }

    @Test
    void keepsOnlyLastTenEntries() {
        List<ChatMessageDto> input = new ArrayList<>();
        for (int i = 0; i < 15; i++) {
            input.add(new ChatMessageDto(i % 2 == 0 ? "user" : "assistant", "msg-" + i));
        }

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        assertEquals(10, out.size());
        assertEquals("msg-5", out.get(0).content());
        assertEquals("msg-14", out.get(9).content());
    }

    @Test
    void truncatesOverlongEntry() {
        String longContent = "a".repeat(5000);
        List<ChatMessageDto> out =
                ChatHistorySanitizer.sanitize(List.of(new ChatMessageDto("user", longContent)));

        assertEquals(1, out.size());
        assertEquals(4000, out.get(0).content().length());
    }

    @Test
    void dropsOldestWhenTotalLengthExceedsLimit() {
        List<ChatMessageDto> input = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            input.add(new ChatMessageDto("user", "x".repeat(2000))); // 5 * 2000 = 10000 > 8000
        }

        List<ChatMessageDto> out = ChatHistorySanitizer.sanitize(input);

        int total = out.stream().mapToInt(m -> m.content().length()).sum();
        assertTrue(total <= 8000);
        assertEquals(4, out.size());
    }
}
