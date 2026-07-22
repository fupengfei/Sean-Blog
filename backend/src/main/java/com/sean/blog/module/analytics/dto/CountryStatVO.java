package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 国家/地区访客统计响应 VO。
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CountryStatVO {

    /** 国家/地区名称 */
    private String country;

    /** 访客数量 */
    private Long cnt;

    /** 占比百分比，如 35.5 表示 35.5% */
    private Double percentage;
}
