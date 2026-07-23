package com.sean.blog.module.ai.memory;

import tools.jackson.databind.ObjectMapper;
import org.springframework.ai.chat.memory.ChatMemoryRepository;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.StringRedisTemplate;
import tools.jackson.core.JacksonException;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

/**
 * 基于项目现有 StringRedisTemplate 的 ChatMemoryRepository 实现。
 *
 * <p>每个会话一个 Redis List（key：{@code 前缀 + conversationId}），
 * 消息以 JSON（{@link StoredMessage}）存储，整表 TTL 通过 EXPIRE 控制。
 * saveAll 为整窗口覆盖写（MessageWindowChatMemory 每次 add 都会重写窗口全量）。</p>
 *
 * <p>不用官方 spring-ai Redis starter 的原因：其依赖 RediSearch 模块且
 * 自动配置不支持密码，与本项目 redis:7-alpine + requirepass 部署不兼容。</p>
 *
 * <p>注意：项目为 Spring Boot 4 / Jackson 3，ObjectMapper 使用
 * {@code tools.jackson.databind} 包（异常为非受检的 JacksonException）。</p>
 */
public class SpringRedisChatMemoryRepository implements ChatMemoryRepository {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final Duration ttl;
    private final String keyPrefix;

    public SpringRedisChatMemoryRepository(StringRedisTemplate redisTemplate,
                                           ObjectMapper objectMapper,
                                           Duration ttl,
                                           String keyPrefix) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
        this.ttl = ttl;
        this.keyPrefix = keyPrefix;
    }

    /**
     * Redis 中的消息存储形态（绕开 Spring AI Message 对象序列化问题）。
     *
     * <p>{@code toolCalls} / {@code toolResponses} 必须完整保留：当链上存在
     * MemoryAdvisor 时，框架会关闭 ToolCallingAdvisor 的内部会话历史
     * （{@code conversationHistoryEnabled=false}），工具循环每一轮及后续请求的
     * 历史均由 memory advisor 从本仓储补回。MessageChatMemoryAdvisor 写入的
     * 完整链路为 {@code [user, assistant(toolCalls), tool(响应), assistant(最终答复)]}——
     * assistant 丢失 toolCalls 或 tool 响应被丢弃，DeepSeek 都会以 400 拒绝
     * （「tool 消息前必须有带 tool_calls 的 assistant」/「带 tool_calls 的
     * assistant 后必须紧跟对应的 tool 响应」）。</p>
     */
    record StoredMessage(String type, String text, List<StoredToolCall> toolCalls,
                         List<StoredToolResponse> toolResponses) {}

    /** AssistantMessage.ToolCall 的存储形态（与框架 record 字段一一对应） */
    record StoredToolCall(String id, String type, String name, String arguments) {}

    /** ToolResponseMessage.ToolResponse 的存储形态（id 即 tool_call_id，DeepSeek 强校验） */
    record StoredToolResponse(String id, String name, String responseData) {}

    @Override
    public List<String> findConversationIds() {
        // 本应用不做会话枚举，窗口式记忆无需此能力
        return List.of();
    }

    @Override
    public List<Message> findByConversationId(String conversationId) {
        List<String> raw = redisTemplate.opsForList().range(key(conversationId), 0, -1);
        if (raw == null || raw.isEmpty()) {
            return List.of();
        }
        List<Message> messages = new ArrayList<>(raw.size());
        for (String json : raw) {
            try {
                StoredMessage stored = objectMapper.readValue(json, StoredMessage.class);
                messages.add(toMessage(stored));
            } catch (JacksonException | IllegalArgumentException e) {
                // 损坏的单条记录跳过，不连累整个会话
            }
        }
        return messages;
    }

    @Override
    public void saveAll(String conversationId, List<Message> messages) {
        String key = key(conversationId);
        redisTemplate.delete(key);
        if (messages == null || messages.isEmpty()) {
            return;
        }
        List<String> serialized = new ArrayList<>(messages.size());
        for (Message message : messages) {
            serialized.add(objectMapper.writeValueAsString(toStored(message)));
        }
        redisTemplate.opsForList().rightPushAll(key, serialized);
        redisTemplate.expire(key, ttl);
    }

    @Override
    public void deleteByConversationId(String conversationId) {
        redisTemplate.delete(key(conversationId));
    }

    private String key(String conversationId) {
        return keyPrefix + conversationId;
    }

    private StoredMessage toStored(Message message) {
        List<StoredToolCall> toolCalls = null;
        if (message instanceof AssistantMessage assistant && assistant.hasToolCalls()) {
            toolCalls = assistant.getToolCalls()
                .stream()
                .map(tc -> new StoredToolCall(tc.id(), tc.type(), tc.name(), tc.arguments()))
                .toList();
        }
        List<StoredToolResponse> toolResponses = null;
        if (message instanceof ToolResponseMessage toolMessage) {
            toolResponses = toolMessage.getResponses()
                .stream()
                .map(r -> new StoredToolResponse(r.id(), r.name(), r.responseData()))
                .toList();
        }
        return new StoredMessage(message.getMessageType().name(), message.getText(), toolCalls, toolResponses);
    }

    private Message toMessage(StoredMessage stored) {
        return switch (stored.type()) {
            case "USER" -> new UserMessage(stored.text());
            case "ASSISTANT" -> {
                if (stored.toolCalls() == null || stored.toolCalls().isEmpty()) {
                    yield new AssistantMessage(stored.text());
                }
                List<AssistantMessage.ToolCall> toolCalls = stored.toolCalls()
                    .stream()
                    .map(tc -> new AssistantMessage.ToolCall(tc.id(), tc.type(), tc.name(), tc.arguments()))
                    .toList();
                yield AssistantMessage.builder().content(stored.text()).toolCalls(toolCalls).build();
            }
            case "TOOL" -> {
                if (stored.toolResponses() == null || stored.toolResponses().isEmpty()) {
                    // 旧格式（仅存 text）无法还原 tool_call_id，跳过该条
                    throw new IllegalArgumentException("TOOL message without stored responses: " + stored.text());
                }
                List<ToolResponseMessage.ToolResponse> responses = stored.toolResponses()
                    .stream()
                    .map(r -> new ToolResponseMessage.ToolResponse(r.id(), r.name(), r.responseData()))
                    .toList();
                yield ToolResponseMessage.builder().responses(responses).build();
            }
            case "SYSTEM" -> new SystemMessage(stored.text());
            default -> throw new IllegalArgumentException("Unsupported message type: " + stored.type());
        };
    }
}
