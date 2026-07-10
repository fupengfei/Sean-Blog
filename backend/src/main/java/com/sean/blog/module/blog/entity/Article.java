package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class Article {
    private Long id;
    private String title;
    private String slug;
    private String contentMd;
    private String contentHtml;
    private String excerpt;
    private String author;
    private String coverImage;
    private Long categoryId;
    private String status;
    private Boolean isFeatured;
    private Long viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Category category;
    private List<Tag> tags;
}
