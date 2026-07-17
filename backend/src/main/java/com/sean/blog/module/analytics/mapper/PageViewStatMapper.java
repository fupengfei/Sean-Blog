package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.PageViewStat;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface PageViewStatMapper {

    int upsert(@Param("id") Long id,
               @Param("pageType") String pageType,
               @Param("pageKey") String pageKey,
               @Param("day") String day,
               @Param("delta") Long delta);

    List<Map<String, Object>> rankByWindow(@Param("startDay") String startDay,
                                           @Param("pageType") String pageType);

    List<Map<String, Object>> trendByDays(@Param("days") int days);

    Map<String, Object> summaryByWindow(@Param("startDay") String startDay);

    Map<String, Object> summaryByWindowPrev(@Param("startDay") String startDay,
                                            @Param("endDay") String endDay);
}
