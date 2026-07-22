package com.sean.blog.module.auth.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * JWT 令牌提供者，负责生成、解析和验证 JWT 令牌。
 * <p>
 * 使用 HMAC-SHA 算法对令牌进行签名，密钥和过期时间从配置文件（{@code jwt.secret} 和 {@code jwt.expiration}）注入。
 * 令牌中仅包含用户名（subject）作为载荷，不存储角色或权限信息。
 * 作为 Spring 组件（{@code @Component}）自动注册到 IoC 容器。
 */
@Component
public class JwtTokenProvider {

    /** HMAC 密钥，由配置中的 secret 字符串生成 */
    private final SecretKey key;

    /** 令牌过期时间（毫秒），由配置中的 jwt.expiration 注入 */
    private final long expiration;

    /**
     * 构造 JwtTokenProvider，从配置文件注入密钥和过期时间。
     *
     * @param secret     JWT 签名密钥字符串（来自 {@code jwt.secret} 配置）
     * @param expiration JWT 过期时间，单位毫秒（来自 {@code jwt.expiration} 配置）
     */
    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration}") long expiration) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    /**
     * 为指定用户名生成 JWT 令牌。
     * <p>
     * 令牌包含用户名（作为 subject）、签发时间和过期时间，使用 HMAC-SHA 密钥签名。
     *
     * @param username 用户名，将作为 JWT 的 subject 存入令牌
     * @return 签名的 JWT 令牌字符串
     */
    public String generateToken(String username) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expiration);
        return Jwts.builder()
                .subject(username)
                .issuedAt(now)
                .expiration(expiry)
                .signWith(key)
                .compact();
    }

    /**
     * 从 JWT 令牌中解析出用户名。
     * <p>
     * 注意：调用前应确保令牌已通过 {@link #validateToken(String)} 验证，
     * 否则可能抛出解析异常。
     *
     * @param token JWT 令牌字符串
     * @return 令牌中存储的用户名（subject）
     * @throws JwtException         如果令牌签名无效或格式错误
     * @throws IllegalArgumentException 如果令牌为空
     */
    public String getUsername(String token) {
        return Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    /**
     * 验证 JWT 令牌是否有效（签名正确且未过期）。
     *
     * @param token JWT 令牌字符串
     * @return true 表示令牌有效，false 表示令牌无效（签名错误、已过期或格式不正确）
     */
    public boolean validateToken(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
