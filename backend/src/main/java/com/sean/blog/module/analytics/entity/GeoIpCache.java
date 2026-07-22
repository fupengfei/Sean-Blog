package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * IP 地理位置缓存实体，对应 geo_ip_cache 表。
 * 作为三层缓存架构（Redis → MySQL → API）中的 MySQL 层，存储已解析的 IP 地理位置信息。
 * 每月 1 日自动清理 90 天前的过期记录。
 *
 * @author sean
 */
@Data
public class GeoIpCache {

    /** IP 地址（主键） */
    private String ip;

    /** 国家 */
    private String country;

    /** 地区/省份 */
    private String region;

    /** 城市 */
    private String city;

    /** 缓存创建时间 */
    private LocalDateTime createdAt;

    /** 缓存更新时间 */
    private LocalDateTime updatedAt;
}
