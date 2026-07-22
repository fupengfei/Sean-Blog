package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 页面访问排行响应 VO，表示某个页面的 PV 统计。
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PageViewStatVO {

    /** 页面类型 */
    private String pageType;

    /** 页面标识 */
    private String pageKey;

    /** 页面显示名称（当前未 join，预留字段） */
    private String name;

    /** PV 计数 */
    private Long cnt;
}
