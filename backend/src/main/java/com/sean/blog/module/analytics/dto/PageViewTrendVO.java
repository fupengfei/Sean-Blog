package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PV 趋势响应 VO，按日期展示各页面类型的每日 PV。
 * 每个字段对应一种 pageType：
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewTrendVO {

    /** 日期，格式 yyyy-MM-dd */
    private String day;

    /** 首页 PV */
    private Long home;

    /** 博客列表页 PV */
    private Long blogList;

    /** 博客详情页 PV */
    private Long blogDetail;

    /** 项目页 PV */
    private Long projects;

    /** 关于我页 PV */
    private Long about;

    /** Skill 列表页 PV */
    private Long skills;

    /** Skill 详情页 PV */
    private Long skillsDetail;
}
