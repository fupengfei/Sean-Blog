package com.sean.blog.module.ai.tracing;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.MessageType;

/**
 * AI 链路追踪 Advisor（order -1000，链最外层）。
 *
 * <p>在 Advisor 链最外层包裹整个请求处理流程：
 * <ul>
 *   <li>{@code before()}：创建根 span {@code "chat-request"}，记录 conversationId、消息长度等基础 tag</li>
 *   <li>{@code after()}：记录总耗时、finish_reason 等结束 tag，关闭 span</li>
 * </ul>
 *
 * <p>所有内部 Advisor（RAG、记忆、持久化等）和 LLM 调用的子 span
 * 都嵌套在此根 span 下，通过 {@link Observation.Scope} 自动建立父子关系。</p>
 *
 * <p>异常安全：before/after 中任何异常仅 log warning，透传原始 request/response，
 * 确保追踪系统故障绝不阻塞主聊天链路。</p>
 */
public class AiTracingAdvisor implements BaseAdvisor {

    private static final Logger log = LoggerFactory.getLogger(AiTracingAdvisor.class);

    /** Advisor 上下文参数键：当前线程的 Observation 实例 */
    static final String OBSERVATION_KEY = "tracing_observation";

    /** Advisor 上下文参数键：请求开始时间戳（System.nanoTime） */
    static final String START_TIME_KEY = "tracing_start_time";

    private final ObservationRegistry observationRegistry;

    public AiTracingAdvisor(ObservationRegistry observationRegistry) {
        this.observationRegistry = observationRegistry;
    }

    @Override
    public String getName() {
        return "AiTracingAdvisor";
    }

    @Override
    public int getOrder() {
        return -1000;
    }

    @Override
    public ChatClientRequest before(ChatClientRequest request, AdvisorChain chain) {
        try {
            String conversationId = resolveConversationId(request);
            String userText = lastUserText(request);

            Observation observation = Observation.createNotStarted(
                            AiObservationConvention.SPAN_CHAT_REQUEST, observationRegistry)
                    .lowCardinalityKeyValue(AiObservationConvention.TAG_CONVERSATION_ID, conversationId)
                    .highCardinalityKeyValue(AiObservationConvention.TAG_MESSAGE_LENGTH,
                            String.valueOf(userText != null ? userText.length() : 0))
                    .start();

            // openScope 使当前 span 成为后续所有子 span 的父级
            Observation.Scope scope = observation.openScope();

            // 将 observation 和 scope 存入 advisor 上下文，供 after() 检索
            request.context().put(OBSERVATION_KEY, observation);
            request.context().put(OBSERVATION_KEY + "_scope", scope);
            request.context().put(START_TIME_KEY, System.nanoTime());
        } catch (Exception e) {
            log.warn("AiTracingAdvisor.before() failed, tracing skipped: {}", e.getMessage());
        }
        return request;
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        try {
            Observation observation = (Observation) response.context().get(OBSERVATION_KEY);
            Observation.Scope scope = (Observation.Scope) response.context().get(OBSERVATION_KEY + "_scope");
            Long startNanos = (Long) response.context().get(START_TIME_KEY);

            if (observation != null) {
                // 记录总耗时
                if (startNanos != null) {
                    long durationMs = (System.nanoTime() - startNanos) / 1_000_000;
                    observation.highCardinalityKeyValue(
                            AiObservationConvention.TAG_TOTAL_DURATION_MS, String.valueOf(durationMs));
                }

                // 记录 LLM 响应元数据：finish_reason
                if (response.chatResponse() != null && response.chatResponse().getResult() != null) {
                    var result = response.chatResponse().getResult();
                    if (result.getMetadata() != null) {
                        String finishReason = result.getMetadata().getFinishReason();
                        if (finishReason != null) {
                            observation.lowCardinalityKeyValue(
                                    AiObservationConvention.TAG_FINISH_REASON, finishReason);
                        }
                    }
                }

                // 先关闭 scope，再停止 observation
                if (scope != null) {
                    scope.close();
                }
                observation.stop();
            }
        } catch (Exception e) {
            log.warn("AiTracingAdvisor.after() failed: {}", e.getMessage());
        }
        return response;
    }

    /**
     * 从 advisor 上下文解析 conversationId（Controller 已通过 ChatMemory.CONVERSATION_ID 注入）。
     */
    private String resolveConversationId(ChatClientRequest request) {
        Object value = request.context().get(ChatMemory.CONVERSATION_ID);
        if (value instanceof String s && !s.isBlank()) {
            return s;
        }
        return "unknown";
    }

    /**
     * 提取最后一条用户消息文本。
     */
    private String lastUserText(ChatClientRequest request) {
        var messages = request.prompt().getInstructions();
        for (int i = messages.size() - 1; i >= 0; i--) {
            if (messages.get(i).getMessageType() == MessageType.USER) {
                return messages.get(i).getText();
            }
        }
        return null;
    }
}
