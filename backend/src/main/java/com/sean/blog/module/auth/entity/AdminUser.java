package com.sean.blog.module.auth.entity;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 管理员用户实体，映射 t_admin_user 表。
 * <p>
 * 用于存储后台管理系统的管理员账号信息，包含用户名、BCrypt 加密后的密码哈希、
 * 以及创建和更新时间。通过 Lombok @Data 自动生成 getter/setter/toString 等方法。
 */
@Data
public class AdminUser {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    private String username;
    private String passwordHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
