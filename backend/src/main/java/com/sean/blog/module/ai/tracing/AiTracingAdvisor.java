package com.sean.blog.module.ai.tracing;

import io.micrometer.observation.Observation;
import io.micrometer.observation.ObservationRegistry;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.CallAdvisor;
import org.springframework.ai.chat.client.advisor.api.CallAdvisorChain;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.messages.MessageType;

/**
 * AI 链路追踪 Advisor（order -1000，链最外层）。
 *
 * <p>实现 {@link CallAdvisor} 的 {@code adviseCall()} 方法，用 try-finally 包裹整个请求处理流程：
 * <ul>
 *   <li>请求到达时：创建根 span {@code "chat-request"}，记录 conversationId、消息长度等基础 tag</li>
 *   <li>finally 块中：记录总耗时、finish_reason 等结束 tag，关闭 scope 和 observation</li>
 * </ul>
 *
 * <p>相比 {@code BaseAdvisor} 的 before/after 分离模式，try-finally 确保 LLM
 * 调用抛出异常（网络错误、频率限制等）时，scope 和 observation 仍被正确关闭，
 * 避免 ThreadLocal 污染和 span 泄漏。</p>
 *
 * <p>所有内部 Advisor（RAG、记忆、持久化等）和 LLM 调用的子 span
 * 都嵌套在此根 span 下，通过 {@link Observation.Scope} 自动建立父子关系。</p>
 *
 * <p>异常安全：adviseCall 中任何异常仅 log warning，透传原始 request/response，
 * 确保追踪系统故障绝不阻塞主聊天链路。</p>
 */
public class AiTracingAdvisor implements CallAdvisor {

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
    public ChatClientResponse adviseCall(ChatClientRequest request, CallAdvisorChain chain) {
        Observation observation = null;
        Observation.Scope scope = null;
        long startNanos = System.nanoTime();
        try {
            String conversationId = resolveConversationId(request);
            String userText = lastUserText(request);

            observation = Observation.createNotStarted(
                            AiObservationConvention.SPAN_CHAT_REQUEST, observationRegistry)
                    .lowCardinalityKeyValue(AiObservationConvention.TAG_CONVERSATION_ID, conversationId)
                    .highCardinalityKeyValue(AiObservationConvention.TAG_MESSAGE_LENGTH,
                            String.valueOf(userText != null ? userText.length() : 0))
                    .start();

            // openScope 使当前 span 成为后续所有子 span 的父级
            scope = observation.openScope();
        } catch (Exception e) {
            log.warn("AiTracingAdvisor before failed: {}", e.getMessage());
        }

        ChatClientResponse response = null;
        try {
            response = chain.nextCall(request);
            return response;
        } catch (Exception e) {
            // 链抛出异常 — 记录 error 但不抑制
            if (observation != null) {
                try {
                    observation.error(e);
                } catch (Exception ex) {
                    log.warn("AiTracingAdvisor observation.error() failed: {}", ex.getMessage());
                }
            }
            throw e;
        } finally {
            // after logic — ALWAYS runs, even on exception
            try {
                if (observation != null) {
                    long durationMs = (System.nanoTime() - startNanos) / 1_000_000;
                    observation.highCardinalityKeyValue(
                            AiObservationConvention.TAG_TOTAL_DURATION_MS, String.valueOf(durationMs));

                    if (response != null && response.chatResponse() != null
                            && response.chatResponse().getResult() != null) {
                        var result = response.chatResponse().getResult();
                        if (result.getMetadata() != null) {
                            String finishReason = result.getMetadata().getFinishReason();
                            if (finishReason != null) {
                                observation.lowCardinalityKeyValue(
                                        AiObservationConvention.TAG_FINISH_REASON, finishReason);
                            }
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("AiTracingAdvisor after failed: {}", e.getMessage());
            } finally {
                if (scope != null) {
                    try {
                        scope.close();
                    } catch (Exception e) {
                        log.warn("AiTracingAdvisor scope.close() failed: {}", e.getMessage());
                    }
                }
                if (observation != null) {
                    try {
                        observation.stop();
                    } catch (Exception e) {
                        log.warn("AiTracingAdvisor observation.stop() failed: {}", e.getMessage());
                    }
                }
            }
        }
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
