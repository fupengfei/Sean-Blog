package com.sean.blog.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;
import java.util.concurrent.ThreadPoolExecutor;

/**
 * 异步任务线程池配置，为不同类型的后台操作提供独立的自定义线程池。
 *
 * <p>定义了两个线程池：</p>
 * <ul>
 *   <li>{@code pvExecutor} — 页面浏览量（Page View）异步记录线程池。</li>
 *   <li>{@code geoExecutor} — IP 地理信息解析异步线程池。</li>
 * </ul>
 *
 * <p>两个线程池均采用 {@link ThreadPoolExecutor.DiscardPolicy} 拒绝策略：
 * 当队列满时新任务将被静默丢弃，并打印错误日志到 stderr。
 * 这样设计是因为 PV 记录和 IP 解析属于非关键辅助功能，即使偶尔丢失也不影响核心业务的正确性。</p>
 */
@Configuration
public class AsyncConfig {

    /**
     * 页面浏览量异步记录线程池。
     *
     * <p>配置参数：
     * <ul>
     *   <li>核心线程数：2</li>
     *   <li>最大线程数：4</li>
     *   <li>队列容量：1000</li>
     *   <li>拒绝策略：静默丢弃（队列满时丢弃新任务）</li>
     * </ul>
     * </p>
     *
     * @return 配置好的 pvExecutor 线程池
     */
    @Bean("pvExecutor")
    public Executor pvExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(2);
        executor.setMaxPoolSize(4);
        executor.setQueueCapacity(1000);
        executor.setThreadNamePrefix("pv-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy() {
            @Override
            public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
                // 日志警告，静默丢弃
                System.err.println("PV record dropped: async queue full");
            }
        });
        executor.initialize();
        return executor;
    }

    /**
     * IP 地理信息解析异步线程池。
     *
     * <p>配置参数：
     * <ul>
     *   <li>核心线程数：1</li>
     *   <li>最大线程数：2</li>
     *   <li>队列容量：500</li>
     *   <li>拒绝策略：静默丢弃（队列满时丢弃新任务）</li>
     * </ul>
     * </p>
     *
     * <p>资源占用比 PV 线程池更小，因为地理信息解析调用频次低于页面浏览记录。</p>
     *
     * @return 配置好的 geoExecutor 线程池
     */
    @Bean("geoExecutor")
    public Executor geoExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(1);
        executor.setMaxPoolSize(2);
        executor.setQueueCapacity(500);
        executor.setThreadNamePrefix("geo-async-");
        executor.setRejectedExecutionHandler(new ThreadPoolExecutor.DiscardPolicy() {
            @Override
            public void rejectedExecution(Runnable r, ThreadPoolExecutor e) {
                System.err.println("Geo resolve dropped: async queue full");
            }
        });
        executor.initialize();
        return executor;
    }
}
