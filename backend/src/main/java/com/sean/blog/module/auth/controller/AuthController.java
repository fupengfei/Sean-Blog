package com.sean.blog.module.auth.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.auth.dto.LoginRequest;
import com.sean.blog.module.auth.dto.PasswordChangeRequest;
import com.sean.blog.module.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;

/**
 * 管理员认证 REST 控制器，提供登录和密码修改接口。
 * <p>
 * 所有接口路径以 {@code /api/v1/admin} 为基础前缀。
 * 登录接口无需认证，修改密码接口需要有效的 JWT 令牌（由 Spring Security 过滤器链保护）。
 * 请求体使用 {@link Valid @Valid} 注解进行 Jakarta Validation 校验。
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AuthController {

    /** 认证业务逻辑服务 */
    private final AuthService authService;

    /**
     * 构造 AuthController，注入 AuthService。
     *
     * @param authService 认证服务
     */
    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * 管理员登录接口。
     * <p>
     * 接收用户名和密码，验证成功后返回 JWT 令牌和过期时间。
     * 该接口为公开接口，无需认证。
     *
     * @param request 登录请求体，包含用户名和密码（经过 {@code @Valid} 校验）
     * @return 统一响应格式，成功时 data 中包含 token 和 expiresIn
     */
    @PostMapping("/login")
    public Result<?> login(@Valid @RequestBody LoginRequest request) {
        return Result.success(authService.login(request.getUsername(), request.getPassword()));
    }

    /**
     * 修改管理员密码接口。
     * <p>
     * 需要有效的 JWT 令牌（通过 {@code Authorization: Bearer <token>} 请求头传递），
     * 从认证上下文（{@link Principal}）中获取当前登录用户名，
     * 验证旧密码正确后更新为新密码。
     *
     * @param request   修改密码请求体，包含旧密码和新密码（经过 {@code @Valid} 校验）
     * @param principal Spring Security 认证主体，用于获取当前登录用户名
     * @return 统一响应格式，成功时 data 为 null
     */
    @PutMapping("/password")
    public Result<?> changePassword(@Valid @RequestBody PasswordChangeRequest request,
                                     Principal principal) {
        authService.changePassword(principal.getName(),
                request.getOldPassword(), request.getNewPassword());
        return Result.success();
    }
}
