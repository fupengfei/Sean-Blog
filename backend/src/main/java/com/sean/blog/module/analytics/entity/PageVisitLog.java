package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class PageVisitLog {
    private Long id;
    private String pageType;
    private String pageKey;
    private String ip;
    private String country;
    private String region;
    private String city;
    private LocalDateTime visitedAt;
}
