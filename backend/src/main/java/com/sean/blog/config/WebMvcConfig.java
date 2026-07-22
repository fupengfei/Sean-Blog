package com.sean.blog.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Spring MVC 全局配置，主要用于跨域（CORS）策略设置。
 *
 * <p>允许跨域的来源：</p>
 * <ul>
 *   <li>{@code http://localhost:3000} — 本地前端开发环境</li>
 *   <li>{@code https://www.fpfos.com} — 生产环境前端域名</li>
 * </ul>
 *
 * <p>允许的方法：GET、POST、PUT、DELETE、OPTIONS（预检请求）。</p>
 * <p>允许携带 Cookie/认证头（{@code allowCredentials(true)}），支持 JWT 跨域认证。</p>
 * <p>作用范围：{@code /api/**} 路径下的所有接口。</p>
 */
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    /**
     * 配置 CORS 跨域映射规则。
     *
     * @param registry CORS 注册器
     */
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:3000", "https://www.fpfos.com")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
