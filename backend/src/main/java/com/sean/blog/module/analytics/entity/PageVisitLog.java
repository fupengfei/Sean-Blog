package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * 页面访问日志实体，对应 page_visit_log 表。
 * 记录每次页面访问的明细，包含 IP 和地理位置信息（异步解析填充）。
 *
 * @author sean
 */
@Data
public class PageVisitLog {

    /** 主键，雪花算法生成 */
    private Long id;

    /** 页面类型 */
    private String pageType;

    /** 页面唯一标识 */
    private String pageKey;

    /** 访问者 IP 地址 */
    private String ip;

    /** 国家（由 GeoLocationService 异步解析填充） */
    private String country;

    /** 地区/省份 */
    private String region;

    /** 城市 */
    private String city;

    /** 访问时间 */
    private LocalDateTime visitedAt;
}
