package com.sean.blog.config;

/**
 * 保留文件，未来如有全局 Jackson 配置需求可在此添加。
 * 当前 Long → String 序列化通过各实体的 @JsonSerialize 注解处理。
 */
public class JacksonConfig {
    // placeholder — Long-to-String serialization handled via @JsonSerialize on entity fields
}
