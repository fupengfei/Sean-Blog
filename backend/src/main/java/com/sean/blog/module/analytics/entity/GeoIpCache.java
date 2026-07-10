package com.sean.blog.module.analytics.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class GeoIpCache {
    private String ip;
    private String country;
    private String region;
    private String city;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
