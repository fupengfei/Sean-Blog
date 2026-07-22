package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * 页面访问统计实体，对应 page_view_stat 表。
 * 按天（day）+ 页面类型（pageType）+ 页面标识（pageKey）三级粒度聚合 PV 计数。
 * 数据每 5 分钟从 Redis 刷入 MySQL。
 *
 * @author sean
 */
@Data
public class PageViewStat {

    /** 主键 */
    private Long id;

    /** 页面类型：home / blog_list / blog_detail / projects / about / skills / skills_detail */
    private String pageType;

    /** 页面唯一标识，如文章 slug */
    private String pageKey;

    /** 统计日期 */
    private LocalDate day;

    /** 当日 PV 计数 */
    private Long cnt;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 最后更新时间 */
    private LocalDateTime updatedAt;
}
