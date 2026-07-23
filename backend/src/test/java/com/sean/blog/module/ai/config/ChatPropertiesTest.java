package com.sean.blog.module.ai.config;

import org.junit.jupiter.api.Test;

import java.time.Duration;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ChatPropertiesTest {

    @Test
    void defaults() {
        ChatProperties props = new ChatProperties();
        assertEquals(40, props.getMemoryWindow());
        assertEquals(Duration.ofDays(7), props.getMemoryTtl());
        assertEquals(4, props.getRag().getFetchSize());
        assertEquals(3, props.getRag().getKeepSize());
    }

    @Test
    void settersWork() {
        ChatProperties props = new ChatProperties();
        props.setMemoryWindow(10);
        props.setMemoryTtl(Duration.ofDays(1));
        props.getRag().setFetchSize(6);
        props.getRag().setKeepSize(2);
        assertEquals(10, props.getMemoryWindow());
        assertEquals(Duration.ofDays(1), props.getMemoryTtl());
        assertEquals(6, props.getRag().getFetchSize());
        assertEquals(2, props.getRag().getKeepSize());
    }
}
