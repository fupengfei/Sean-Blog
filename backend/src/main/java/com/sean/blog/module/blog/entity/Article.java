package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class Article {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    private String title;
    private String slug;
    private String contentMd;
    private String contentHtml;
    private String excerpt;
    private String author;
    private LocalDate publishDate;
    private String coverImage;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long categoryId;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long prerequisiteId;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long nextArticleId;
    private String status;
    private Boolean isFeatured;
    private Long viewCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Category category;
    private List<Tag> tags;
}
