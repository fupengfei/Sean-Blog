package com.sean.blog.module.file.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class FileBundle {
    private Long id;
    private String name;
    private String description;
    private String rootPath;
    private String type;
    private String status;
    private Integer fileCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
