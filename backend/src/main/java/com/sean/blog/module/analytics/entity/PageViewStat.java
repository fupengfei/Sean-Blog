package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class PageViewStat {
    private Long id;
    private String pageType;
    private String pageKey;
    private LocalDate day;
    private Long cnt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
