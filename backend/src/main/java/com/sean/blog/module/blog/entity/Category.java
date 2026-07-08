package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class Category {
    private Long id;
    private String name;
    private String slug;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
