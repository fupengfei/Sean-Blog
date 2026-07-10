package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewTrendVO {
    private String day;
    private Long home;
    private Long blogList;
    private Long blogDetail;
    private Long projects;
    private Long about;
    private Long skills;
    private Long skillsDetail;
}
