package com.sean.blog.config;

import com.sean.blog.module.auth.security.JwtTokenFilter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security + JWT 认证配置类。
 *
 * <p>安全策略概述：</p>
 * <ul>
 *   <li><b>CSRF 关闭</b> — 前后端分离 + JWT 无状态认证，无需 CSRF 保护。</li>
 *   <li><b>无状态会话</b> — 设置为 {@link SessionCreationPolicy#STATELESS}，每次请求携带 JWT 令牌。</li>
 *   <li><b>路由权限分层</b>：
 *     <ul>
 *       <li>{@code /api/v1/admin/login} — 登录接口，放行。</li>
 *       <li>{@code /api/v1/admin/**} — 其他 Admin 接口，需认证。</li>
 *       <li>{@code /**} — 其余所有公开接口，放行。</li>
 *     </ul>
 *   </li>
 *   <li><b>JWT 过滤器</b> — 在 {@link UsernamePasswordAuthenticationFilter} 之前插入 {@link JwtTokenFilter}，
 *       从请求头解析 Token 并设置 SecurityContext。</li>
 *   <li><b>密码编码器</b> — {@link BCryptPasswordEncoder}，用于 Admin 密码的加密存储与验证。</li>
 * </ul>
 */
@Configuration
public class SecurityConfig {

    private final JwtTokenFilter jwtTokenFilter;

    public SecurityConfig(JwtTokenFilter jwtTokenFilter) {
        this.jwtTokenFilter = jwtTokenFilter;
    }

    /**
     * 配置安全过滤链。
     *
     * <p>核心配置：禁用 CSRF、无状态会话、分层路由权限、插入 JWT 过滤器。</p>
     *
     * @param http Spring Security 的 HttpSecurity 构建器
     * @return 组装好的 SecurityFilterChain
     * @throws Exception 配置过程可能抛出的异常
     */
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/v1/admin/login").permitAll()
                .requestMatchers("/api/v1/admin/**").authenticated()
                .anyRequest().permitAll()
            )
            .addFilterBefore(jwtTokenFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    /**
     * 密码编码器 Bean。
     *
     * <p>使用 BCrypt 算法，自动生成随机盐值，是 Spring Security 推荐的密码存储方案。</p>
     *
     * @return BCryptPasswordEncoder 实例
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
