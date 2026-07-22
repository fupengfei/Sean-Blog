package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 访客汇总响应 VO（独立 IP 去重统计），用于 Dashboard 概览卡片。
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitorSummaryVO {

    /** 总 UV（近 7 天去重 IP 数） */
    private Long totalUv;

    /** 今日 UV */
    private Long todayUv;

    /** 近 7 天 UV */
    private Long weekUv;
}
