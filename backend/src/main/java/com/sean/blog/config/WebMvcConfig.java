package com.sean.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.web.servlet.config.annotation.AsyncSupportConfigurer;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 全局配置：跨域 + 异步请求线程池。
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        // 用 allowedOriginPatterns 代替精确 allowedOrigins：
        // 生产环境通过 http/https、带不带 www 访问时 Origin 各不相同，精确枚举容易漏配导致 403
        registry.addMapping("/api/**")
                .allowedOriginPatterns(
                        "http://localhost:*",          // 本地开发（Next.js 3000 / 后端直连 8880）
                        "https://fpfos.com",           // 生产裸域名（HTTPS）
                        "https://*.fpfos.com",         // 生产子域名，如 www（HTTPS）
                        "http://fpfos.com",            // 生产裸域名（HTTP，未强制跳转 HTTPS 时）
                        "http://*.fpfos.com",          // 生产子域名（HTTP）
                        "http://106.54.196.106",       // IP 直接访问（80 端口，Origin 不带端口号）
                        "http://106.54.196.106:*")     // IP 直接访问（其他端口，如 :3000）
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("X-Conversation-Id")
                .allowCredentials(true);  // allowedOriginPatterns 可与 credentials 组合（allowedOrigins("*") 不行）
    }

    /** 为 SSE 等异步请求配置线程池，替换默认的 SimpleAsyncTaskExecutor */
    @Override
    public void configureAsyncSupport(AsyncSupportConfigurer configurer) {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(8);
        executor.setQueueCapacity(50);
        executor.setThreadNamePrefix("mvc-async-");
        executor.initialize();
        configurer.setTaskExecutor(executor);
        configurer.setDefaultTimeout(5 * 60 * 1000); // SSE 长连接 5 分钟超时
    }
}
