package com.sean.blog.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 登录请求 DTO，包含用户名和密码字段。
 * <p>
 * 使用 Jakarta Validation 对字段进行非空校验，校验失败时返回相应的中文提示信息。
 * 通过 Lombok @Data 自动生成 getter/setter。
 */
@Data
public class LoginRequest {
    @NotBlank(message = "用户名不能为空")
    private String username;

    @NotBlank(message = "密码不能为空")
    private String password;
}
