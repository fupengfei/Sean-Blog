package com.sean.blog.module.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

/**
 * JWT 认证过滤器，继承 OncePerRequestFilter 确保每个请求只执行一次。
 * <p>
 * 工作原理：
 * <ol>
 *   <li>从请求头 {@code Authorization} 中提取 Bearer 令牌</li>
 *   <li>调用 {@link JwtTokenProvider#validateToken(String)} 验证令牌有效性</li>
 *   <li>验证通过后，从令牌中解析用户名并设置到 {@link SecurityContextHolder} 的认证上下文中</li>
 *   <li>未携带令牌或令牌无效的请求继续传递给后续过滤器处理（由 Spring Security 配置决定是否拒绝）</li>
 * </ol>
 * 认证成功后创建的是仅包含用户名、无角色权限的 {@link UsernamePasswordAuthenticationToken}。
 * 作为 Spring 组件（{@code @Component}）自动注册到 IoC 容器。
 */
@Component
public class JwtTokenFilter extends OncePerRequestFilter {

    /** JWT 令牌提供者，负责令牌的验证和解析 */
    private final JwtTokenProvider tokenProvider;

    /**
     * 构造 JwtTokenFilter，注入 JwtTokenProvider。
     *
     * @param tokenProvider 用于验证和解析 JWT 的提供者
     */
    public JwtTokenFilter(JwtTokenProvider tokenProvider) {
        this.tokenProvider = tokenProvider;
    }

    /**
     * 过滤器核心逻辑：提取 Authorization 头中的 JWT 令牌，验证并设置认证上下文。
     * <p>
     * 每个 HTTP 请求只执行一次（由 OncePerRequestFilter 保证），无论最终是否认证成功，
     * 都会调用 {@code filterChain.doFilter()} 将请求传递给下一个过滤器。
     *
     * @param request     HTTP 请求
     * @param response    HTTP 响应
     * @param filterChain 过滤器链
     * @throws ServletException 过滤过程中可能抛出的异常
     * @throws IOException      I/O 异常
     */
    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        // 从请求头中提取 JWT 令牌
        String token = extractToken(request);
        // 令牌存在且有效时，设置 Spring Security 认证上下文
        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            String username = tokenProvider.getUsername(token);
            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(username, null, Collections.emptyList());
            SecurityContextHolder.getContext().setAuthentication(auth);
        }
        // 无论认证是否成功，继续执行过滤器链
        filterChain.doFilter(request, response);
    }

    /**
     * 从 HTTP 请求的 {@code Authorization} 头中提取 Bearer 令牌。
     * <p>
     * 期望格式：{@code Authorization: Bearer <token>}。
     * 去除 "Bearer " 前缀（7 个字符）后返回令牌本体。
     *
     * @param request HTTP 请求
     * @return JWT 令牌字符串，如果请求头不存在或格式不正确则返回 null
     */
    private String extractToken(HttpServletRequest request) {
        String bearer = request.getHeader("Authorization");
        if (StringUtils.hasText(bearer) && bearer.startsWith("Bearer ")) {
            return bearer.substring(7);
        }
        return null;
    }
}
