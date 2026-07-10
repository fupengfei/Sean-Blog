package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewStatVO {
    private String pageType;
    private String pageKey;
    private String name;
    private Long cnt;
}
