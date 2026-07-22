package com.sean.blog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Sean's Blog 后端应用主启动类（Spring Boot 入口）。
 *
 * <p>自动配置组件扫描、Spring MVC、MyBatis 等基础设施，并通过注解开启以下特性：</p>
 * <ul>
 *   <li>{@code @EnableScheduling} — 启用定时任务调度，用于定期刷新文章访问量、清理过期数据等后台作业。</li>
 *   <li>{@code @EnableAsync} — 启用异步方法执行（配合 {@link com.sean.blog.config.AsyncConfig} 中的线程池），
 *       用于页面浏览量记录、IP 地理信息解析等非阻塞的辅助逻辑。</li>
 * </ul>
 */
@SpringBootApplication
@EnableScheduling
@EnableAsync
public class BlogApplication {

    /**
     * 应用启动入口。
     *
     * @param args 命令行参数
     */
    public static void main(String[] args) {
        SpringApplication.run(BlogApplication.class, args);
    }
}
