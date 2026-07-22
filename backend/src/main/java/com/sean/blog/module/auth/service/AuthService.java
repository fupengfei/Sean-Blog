package com.sean.blog.module.auth.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.auth.entity.AdminUser;
import com.sean.blog.module.auth.mapper.AdminUserMapper;
import com.sean.blog.module.auth.security.JwtTokenProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

/**
 * 认证业务逻辑服务，处理管理员登录和密码修改。
 * <p>
 * 依赖于 {@link AdminUserMapper} 进行数据库查询、{@link PasswordEncoder} 进行 BCrypt 密码比对与加密、
 * {@link JwtTokenProvider} 生成和验证 JWT 令牌。
 * 密码修改操作使用 {@link Transactional @Transactional} 注解保证事务性。
 */
@Service
public class AuthService {

    /** 管理员用户 Mapper，用于数据库操作 */
    private final AdminUserMapper adminUserMapper;

    /** BCrypt 密码编码器，用于密码比对和加密 */
    private final PasswordEncoder passwordEncoder;

    /** JWT 令牌提供者，用于生成登录令牌 */
    private final JwtTokenProvider tokenProvider;

    /**
     * 构造 AuthService，注入所需的依赖。
     *
     * @param adminUserMapper 管理员用户 Mapper
     * @param passwordEncoder 密码编码器
     * @param tokenProvider   JWT 令牌提供者
     */
    public AuthService(AdminUserMapper adminUserMapper,
                       PasswordEncoder passwordEncoder,
                       JwtTokenProvider tokenProvider) {
        this.adminUserMapper = adminUserMapper;
        this.passwordEncoder = passwordEncoder;
        this.tokenProvider = tokenProvider;
    }

    /**
     * 管理员登录：验证用户名密码，成功后返回 JWT 令牌。
     * <p>
     * 流程：
     * <ol>
     *   <li>通过用户名查询数据库中的管理员用户</li>
     *   <li>使用 BCrypt 比对用户输入的密码与数据库中的密码哈希</li>
     *   <li>用户名不存在或密码不匹配时抛出 {@link BusinessException}（401）</li>
     *   <li>验证成功后生成 JWT 令牌并返回，同时返回固定的过期时间（24 小时）</li>
     * </ol>
     *
     * @param username 用户名
     * @param password 明文密码
     * @return 包含 token（JWT 字符串）和 expiresIn（过期时间，毫秒）的 Map
     * @throws BusinessException 用户名或密码错误时抛出，状态码 401
     */
    public Map<String, Object> login(String username, String password) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BusinessException(401, "用户名或密码错误");
        }
        String token = tokenProvider.generateToken(username);
        return Map.of("token", token, "expiresIn", 86400000L);
    }

    /**
     * 修改管理员密码，需要验证旧密码。
     * <p>
     * 流程：
     * <ol>
     *   <li>通过用户名查询管理员用户</li>
     *   <li>验证旧密码是否正确（BCrypt 比对）</li>
     *   <li>旧密码不正确时抛出 {@link BusinessException}（400）</li>
     *   <li>使用 BCrypt 加密新密码</li>
     *   <li>更新数据库中的密码哈希</li>
     * </ol>
     * 整个操作在事务中执行（{@link Transactional}），确保原子性。
     *
     * @param username    用户名
     * @param oldPassword 旧密码（明文）
     * @param newPassword 新密码（明文）
     * @throws BusinessException 用户不存在或旧密码不正确时抛出，状态码 400
     */
    @Transactional
    public void changePassword(String username, String oldPassword, String newPassword) {
        AdminUser user = adminUserMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(oldPassword, user.getPasswordHash())) {
            throw new BusinessException(400, "旧密码不正确");
        }
        String newHash = passwordEncoder.encode(newPassword);
        adminUserMapper.updatePassword(username, newHash);
    }
}
