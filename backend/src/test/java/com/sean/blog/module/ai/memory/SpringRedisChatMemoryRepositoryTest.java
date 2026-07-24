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
import org.springframework.ai.chat.messages.ToolResponseMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.data.redis.core.ListOperations;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.SessionCallback;
import org.springframework.data.redis.core.StringRedisTemplate;

import java.time.Duration;
import java.util.Collection;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SpringRedisChatMemoryRepositoryTest {

    @Mock
    private StringRedisTemplate redisTemplate;

    @Mock
    private RedisOperations<String, String> sessionOps;

    private ListOperations<String, String> listOps;
    private SpringRedisChatMemoryRepository repository;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        listOps = mock(ListOperations.class);
        // 直接路径（findByConversationId / deleteByConversationId）
        lenient().when(redisTemplate.opsForList()).thenReturn(listOps);
        // MULTI/EXEC 路径（saveAll）：让 mock 的 execute 真实调用 SessionCallback
        lenient().when(redisTemplate.execute(any(SessionCallback.class))).thenAnswer(invocation -> {
            SessionCallback<?> callback = invocation.getArgument(0);
            return callback.execute(sessionOps);
        });
        lenient().when(sessionOps.opsForList()).thenReturn(listOps);
        lenient().when(sessionOps.exec()).thenReturn(List.of());

        repository = new SpringRedisChatMemoryRepository(
                redisTemplate, new ObjectMapper(), Duration.ofDays(7), "chat:memory:");
    }

    @Test
    void saveAllDeletesThenPushesAndExpires() {
        List<Message> messages = List.of(new UserMessage("问"), new AssistantMessage("答"));

        repository.saveAll("cid-1", messages);

        // 验证 MULTI/EXEC 内操作通过 sessionOps 执行
        verify(sessionOps).delete("chat:memory:cid-1");
        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(listOps).rightPushAll(eq("chat:memory:cid-1"), captor.capture());
        assertEquals(2, captor.getValue().size());
        assertTrue(captor.getValue().iterator().next().contains("\"type\":\"USER\""));
        verify(sessionOps).expire("chat:memory:cid-1", Duration.ofDays(7));
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
    void assistantToolCallsSurviveRoundTrip() {
        // 工具调用回归用例：链上有 MemoryAdvisor 时框架关闭 ToolCallingAdvisor 内部历史，
        // 每轮靠仓储补回 assistant(toolCalls)；仓储若丢失 toolCalls，DeepSeek 400。
        AssistantMessage.ToolCall toolCall =
                new AssistantMessage.ToolCall("call_1", "function", "listProjects", "{}");
        AssistantMessage assistant = AssistantMessage.builder()
                .content("")
                .toolCalls(List.of(toolCall))
                .build();

        repository.saveAll("cid-1", List.of(new UserMessage("你有哪些项目？"), assistant));

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(listOps).rightPushAll(eq("chat:memory:cid-1"), captor.capture());
        List<String> serialized = List.copyOf(captor.getValue());
        assertTrue(serialized.get(1).contains("\"name\":\"listProjects\""));

        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(serialized);
        List<Message> restored = repository.findByConversationId("cid-1");

        assertEquals(2, restored.size());
        AssistantMessage restoredAssistant = (AssistantMessage) restored.get(1);
        assertTrue(restoredAssistant.hasToolCalls());
        assertEquals(List.of(toolCall), restoredAssistant.getToolCalls());
    }

    @Test
    void toolCallChainSurvivesRoundTrip() {
        // 完整工具调用链回归：[user, assistant(toolCalls), tool(响应), assistant(最终答复)]。
        // MessageChatMemoryAdvisor 按此形态写入 memory；跨请求回放时任一环节丢失
        // （assistant 缺 toolCalls / tool 响应被丢弃），DeepSeek 均 400。
        AssistantMessage.ToolCall toolCall =
                new AssistantMessage.ToolCall("call_1", "function", "listProjects", "{}");
        ToolResponseMessage.ToolResponse toolResponse =
                new ToolResponseMessage.ToolResponse("call_1", "listProjects", "[{\"name\":\"机场巴士\"}]");
        List<Message> chain = List.of(
                new UserMessage("你有哪些项目？"),
                AssistantMessage.builder().content("好的").toolCalls(List.of(toolCall)).build(),
                ToolResponseMessage.builder().responses(List.of(toolResponse)).build(),
                new AssistantMessage("Sean 的项目有：机场巴士"));

        repository.saveAll("cid-1", chain);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<Collection<String>> captor = ArgumentCaptor.forClass(Collection.class);
        verify(listOps).rightPushAll(eq("chat:memory:cid-1"), captor.capture());
        List<String> serialized = List.copyOf(captor.getValue());

        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(serialized);
        List<Message> restored = repository.findByConversationId("cid-1");

        assertEquals(4, restored.size());
        assertEquals(MessageType.USER, restored.get(0).getMessageType());

        AssistantMessage restoredAssistant = (AssistantMessage) restored.get(1);
        assertEquals(List.of(toolCall), restoredAssistant.getToolCalls());

        ToolResponseMessage restoredTool = (ToolResponseMessage) restored.get(2);
        assertEquals(MessageType.TOOL, restoredTool.getMessageType());
        assertEquals(List.of(toolResponse), restoredTool.getResponses());

        assertEquals("Sean 的项目有：机场巴士", restored.get(3).getText());
    }

    @Test
    void legacyToolEntryWithoutResponsesIsSkipped() {
        // 旧格式 TOOL 条目（仅 type+text，无 responses）无法还原 tool_call_id，
        // 应跳过该条而不连累整个会话
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"问\"}",
                "{\"type\":\"TOOL\",\"text\":\"旧格式工具结果\"}",
                "{\"type\":\"ASSISTANT\",\"text\":\"答\"}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(2, messages.size());
        assertEquals(MessageType.USER, messages.get(0).getMessageType());
        assertEquals(MessageType.ASSISTANT, messages.get(1).getMessageType());
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

    @Test
    void orphanToolMessageDroppedInRepair() {
        // 窗口截断把 assistant(toolCalls) 截掉留下孤立 TOOL，回放会触发 DeepSeek 400
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"问\"}",
                "{\"type\":\"TOOL\",\"toolResponses\":[{\"id\":\"call_1\",\"name\":\"listProjects\",\"responseData\":\"[]\"}]}",
                "{\"type\":\"ASSISTANT\",\"text\":\"答\"}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(2, messages.size());
        assertEquals(MessageType.USER, messages.get(0).getMessageType());
        assertEquals(MessageType.ASSISTANT, messages.get(1).getMessageType());
    }

    @Test
    void assistantToolCallsStrippedWhenNotFollowedByTool() {
        // 旧数据或配对截断：assistant(toolCalls) 后紧跟的不是 TOOL → 降级为纯文本
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"问\"}",
                "{\"type\":\"ASSISTANT\",\"text\":\"好的\",\"toolCalls\":[{\"id\":\"call_1\",\"type\":\"function\",\"name\":\"listProjects\",\"arguments\":\"{}\"}]}",
                "{\"type\":\"ASSISTANT\",\"text\":\"最终答复\"}",
                "{\"type\":\"USER\",\"text\":\"再问\"}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(4, messages.size());
        AssistantMessage stripped = (AssistantMessage) messages.get(1);
        assertTrue(!stripped.hasToolCalls(), "非末尾的 assistant(toolCalls) 应被降级");
        assertEquals("好的", stripped.getText());
        assertEquals("最终答复", messages.get(2).getText());
        assertEquals("再问", messages.get(3).getText());
    }

    @Test
    void trailingAssistantToolCallsPreserved() {
        // 工具循环第二轮形态 [user, assistant(toolCalls)]——末尾必须保留 toolCalls，
        // 否则框架无法据此补回 tool 消息，DeepSeek 400「tool 消息前缺 tool_calls」
        when(listOps.range("chat:memory:cid-1", 0, -1)).thenReturn(List.of(
                "{\"type\":\"USER\",\"text\":\"你有哪些项目？\"}",
                "{\"type\":\"ASSISTANT\",\"text\":\"\",\"toolCalls\":[{\"id\":\"call_1\",\"type\":\"function\",\"name\":\"listProjects\",\"arguments\":\"{}\"}]}"));

        List<Message> messages = repository.findByConversationId("cid-1");

        assertEquals(2, messages.size());
        AssistantMessage trailing = (AssistantMessage) messages.get(1);
        assertTrue(trailing.hasToolCalls(), "末尾的 assistant(toolCalls) 必须保留");
        assertEquals("call_1", trailing.getToolCalls().get(0).id());
    }
}
