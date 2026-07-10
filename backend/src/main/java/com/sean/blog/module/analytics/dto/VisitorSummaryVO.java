package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitorSummaryVO {
    private Long totalUv;
    private Long todayUv;
    private Long weekUv;
}
