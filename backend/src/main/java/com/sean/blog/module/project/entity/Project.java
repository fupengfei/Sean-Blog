package com.sean.blog.module.project.entity;
import lombok.Data;
import java.time.LocalDateTime;
@Data
public class Project {
    private Long id;
    private String title;
    private String description;
    private String url;
    private String githubUrl;
    private String coverImage;
    private String tags;       // JSON string
    private Boolean isFeatured;
    private Integer sortOrder;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
