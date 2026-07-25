package com.sean.blog.module.ai.tracing;

import io.micrometer.observation.ObservationRegistry;
import org.springframework.ai.chat.client.ChatClientRequest;
import org.springframework.ai.chat.client.ChatClientResponse;
import org.springframework.ai.chat.client.advisor.api.AdvisorChain;
import org.springframework.ai.chat.client.advisor.api.BaseAdvisor;

/**
 * AI 链路追踪 Advisor 桩代码（Task 5）。
 *
 * <p>Task 6 将替换为完整实现（Observation-based span 创建 + tag 填充）。</p>
 */
public class AiTracingAdvisor implements BaseAdvisor {

    public AiTracingAdvisor(ObservationRegistry observationRegistry) {
        // 桩：不存储 registry，Task 6 补全
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
        return request;
    }

    @Override
    public ChatClientResponse after(ChatClientResponse response, AdvisorChain chain) {
        return response;
    }
}
