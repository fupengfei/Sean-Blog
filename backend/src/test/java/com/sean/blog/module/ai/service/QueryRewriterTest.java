package com.sean.blog.module.ai.service;

import com.sean.blog.module.ai.config.ChatProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.Answers;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QueryRewriterTest {

    @Mock
    private ChatClient.Builder chatClientBuilder;

    @Mock(answer = Answers.RETURNS_DEEP_STUBS)
    private ChatClient chatClient;

    private ChatProperties chatProperties;

    private static final String SYSTEM_PROMPT = "You are a query rewriting assistant.";

    @BeforeEach
    void setUp() {
        when(chatClientBuilder.build()).thenReturn(chatClient);
        chatProperties = new ChatProperties();
    }

    private QueryRewriter rewriter() {
        return new QueryRewriter(chatClientBuilder, chatProperties, SYSTEM_PROMPT);
    }

    // -----------------------------------------------------------------------
    // 改写成功
    // -----------------------------------------------------------------------

    @Test
    void rewritesShortQueryWithHistory() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("Docker Compose 多服务编排配置方法");

        List<Message> history = List.of(
                new UserMessage("Docker 部署有什么注意事项？"),
                new AssistantMessage("Docker 部署需要注意网络配置、数据卷挂载等方面..."),
                new UserMessage("那个 compose 怎么配？")
        );
        String result = rewriter().rewrite("那个 compose 怎么配？", history);

        assertEquals("Docker Compose 多服务编排配置方法", result);
    }

    @Test
    void keepsStandaloneQueryAsIs() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("Spring Boot 整合 MyBatis 完整教程");

        List<Message> history = List.of(
                new UserMessage("Spring Boot 整合 MyBatis 完整教程")
        );
        String result = rewriter().rewrite("Spring Boot 整合 MyBatis 完整教程", history);

        assertEquals("Spring Boot 整合 MyBatis 完整教程", result);
    }

    // -----------------------------------------------------------------------
    // 降级
    // -----------------------------------------------------------------------

    @Test
    void returnsOriginalQueryWhenLlmFails() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenThrow(new RuntimeException("LLM timeout"));

        List<Message> history = List.of(new UserMessage("Docker 部署"));
        String result = rewriter().rewrite("Docker 部署", history);

        assertEquals("Docker 部署", result);
    }

    @Test
    void returnsOriginalQueryWhenLlmReturnsNull() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn(null);

        List<Message> history = List.of(new UserMessage("Docker 部署"));
        String result = rewriter().rewrite("Docker 部署", history);

        assertEquals("Docker 部署", result);
    }

    @Test
    void returnsOriginalQueryWhenLlmReturnsBlank() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("   ");

        List<Message> history = List.of(new UserMessage("Docker 部署"));
        String result = rewriter().rewrite("Docker 部署", history);

        assertEquals("Docker 部署", result);
    }

    @Test
    void trimsWhitespaceFromRewrittenQuery() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("  Docker Compose 多服务编排  \n");

        List<Message> history = List.of(new UserMessage("compose 配法"));
        String result = rewriter().rewrite("compose 配法", history);

        assertEquals("Docker Compose 多服务编排", result);
    }

    // -----------------------------------------------------------------------
    // 开关
    // -----------------------------------------------------------------------

    @Test
    void returnsOriginalQueryWhenDisabled() {
        chatProperties.getRag().getQueryRewrite().setEnabled(false);

        // 即使 LLM 不可用，disabled 时也不应调用
        List<Message> history = List.of(new UserMessage("Docker 部署"));
        String result = rewriter().rewrite("Docker 部署", history);

        assertEquals("Docker 部署", result);
    }

    // -----------------------------------------------------------------------
    // 历史为空
    // -----------------------------------------------------------------------

    @Test
    void worksWithEmptyHistory() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("Redis 持久化 RDB AOF 配置");

        String result = rewriter().rewrite("Redis 持久化怎么配", List.of());

        assertEquals("Redis 持久化 RDB AOF 配置", result);
    }

    @Test
    void worksWithNullHistory() {
        when(chatClient.prompt().system(anyString()).user(anyString()).call().content())
                .thenReturn("Redis 集群搭建教程");

        String result = rewriter().rewrite("Redis 集群搭建教程", null);

        assertEquals("Redis 集群搭建教程", result);
    }
}
