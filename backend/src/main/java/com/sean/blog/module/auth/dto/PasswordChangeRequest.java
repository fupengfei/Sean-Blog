package com.sean.blog.module.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 修改密码请求 DTO，包含旧密码和新密码字段。
 * <p>
 * 使用 Jakarta Validation 对两个字段进行非空校验，校验失败时返回相应的中文提示信息。
 * 通过 Lombok @Data 自动生成 getter/setter。
 */
@Data
public class PasswordChangeRequest {
    @NotBlank(message = "旧密码不能为空")
    private String oldPassword;

    @NotBlank(message = "新密码不能为空")
    private String newPassword;
}
