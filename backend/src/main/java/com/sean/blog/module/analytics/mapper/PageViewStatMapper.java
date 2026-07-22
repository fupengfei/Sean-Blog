package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.PageViewStat;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * PV 统计数据访问层，对应 page_view_stat 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface PageViewStatMapper {

    /** 按天 + pageType + pageKey 执行 upsert，delta 累加到 cnt */
    int upsert(@Param("id") Long id,
               @Param("pageType") String pageType,
               @Param("pageKey") String pageKey,
               @Param("day") String day,
               @Param("delta") Long delta);

    /** 查询指定时间窗口内的 PV 排行（按 cnt 降序） */
    List<Map<String, Object>> rankByWindow(@Param("startDay") String startDay,
                                           @Param("pageType") String pageType);

    /** 查询最近 N 天按天 + pageType 聚合的 PV 趋势数据 */
    List<Map<String, Object>> trendByDays(@Param("days") int days);

    /** 查询指定时间窗口内的总 PV */
    Map<String, Object> summaryByWindow(@Param("startDay") String startDay);

    /** 查询上一个时间窗口的总 PV，用于计算环比 */
    Map<String, Object> summaryByWindowPrev(@Param("startDay") String startDay,
                                            @Param("endDay") String endDay);
}
