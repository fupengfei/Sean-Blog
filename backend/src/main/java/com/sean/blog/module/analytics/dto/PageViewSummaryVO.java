package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PV 汇总响应 VO，用于 Dashboard 概览卡片。
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewSummaryVO {

    /** 总 PV（近 7 天累计） */
    private Long totalPv;

    /** 今日 PV */
    private Long todayPv;

    /** 近 7 天 PV */
    private Long weekPv;

    /** 总 PV 环比变化百分比 */
    private Double totalDelta;

    /** 近 7 天 PV 环比变化百分比 */
    private Double weekDelta;
}
