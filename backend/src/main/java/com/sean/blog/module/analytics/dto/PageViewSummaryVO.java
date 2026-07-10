package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewSummaryVO {
    private Long totalPv;
    private Long todayPv;
    private Long weekPv;
    private Double totalDelta;
    private Double weekDelta;
}
