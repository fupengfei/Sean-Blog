package com.sean.blog.module.blog.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ArticleRelated {
    private Long id;
    private Long articleId;
    private Long relatedArticleId;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
}
