package com.sean.blog.module.auth.entity;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class AdminUser {
    private Long id;
    private String username;
    private String passwordHash;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
