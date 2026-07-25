package com.sean.blog.module.ai.tracing;

import io.micrometer.observation.ObservationRegistry;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * AI 链路追踪配置。
 *
 * <p>ObservationRegistry 由 Spring Boot 自动配置提供（micrometer-core 在 classpath 时）。
 * 本类仅作为 tracing 相关 bean 的注册入口。</p>
 */
@Configuration
public class AiTracingConfig {

    /**
     * 显式声明 ObservationRegistry bean 依赖，确保自动配置已就绪。
     * 实际上由 Spring Boot {@code ObservationAutoConfiguration} 提供，
     * 这里仅用于文档意图。
     */
    @Bean
    public AiTracingAdvisor aiTracingAdvisor(ObservationRegistry observationRegistry) {
        return new AiTracingAdvisor(observationRegistry);
    }
}
