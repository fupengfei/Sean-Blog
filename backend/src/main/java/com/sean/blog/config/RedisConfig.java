package com.sean.blog.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.serializer.StringRedisSerializer;

/**
 * Redis 配置类，自定义 {@link RedisTemplate} 的序列化方式。
 *
 * <p>默认的 RedisTemplate 使用 JDK 序列化（二进制），在 Redis CLI 中查看时不可读。
 * 本配置将 Key、Value、HashKey、HashValue 全部统一为 {@link StringRedisSerializer}，
 * 优点：</p>
 * <ul>
 *   <li>简单可靠，无需处理复杂对象序列化兼容问题。</li>
 *   <li>在 Redis CLI 中可直接查看和调试存储内容。</li>
 *   <li>适合本项目以字符串为主的缓存场景（Token 黑名单、浏览量计数等）。</li>
 * </ul>
 *
 * <p>对于直接使用 {@link org.springframework.data.redis.core.StringRedisTemplate} 的场景不受此配置影响。</p>
 */
@Configuration
public class RedisConfig {

    /**
     * 配置使用 String 序列化的 RedisTemplate Bean。
     *
     * @param factory Redis 连接工厂（由 Spring Boot 自动配置注入）
     * @return 全部使用 String 序列化的 RedisTemplate 实例
     */
    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory factory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(factory);

        // 全部使用 String 序列化，简单可靠
        StringRedisSerializer stringSerializer = new StringRedisSerializer();
        template.setKeySerializer(stringSerializer);
        template.setValueSerializer(stringSerializer);
        template.setHashKeySerializer(stringSerializer);
        template.setHashValueSerializer(stringSerializer);
        template.afterPropertiesSet();
        return template;
    }
}
