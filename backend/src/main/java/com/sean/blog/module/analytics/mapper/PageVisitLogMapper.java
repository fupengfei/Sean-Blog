package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.PageVisitLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

@Mapper
public interface PageVisitLogMapper {

    int insert(PageVisitLog log);

    int updateGeo(@Param("id") Long id,
                  @Param("country") String country,
                  @Param("region") String region,
                  @Param("city") String city);

    long countUniqueIp(@Param("startDay") String startDay);

    List<Map<String, Object>> countryRank(@Param("startDay") String startDay);

    /** 查找地理位置为空的前 N 条记录，用于兜底批量解析 */
    List<PageVisitLog> findWithoutGeo(@Param("limit") int limit);
}
