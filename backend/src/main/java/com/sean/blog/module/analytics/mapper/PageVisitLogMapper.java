package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.PageVisitLog;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Map;

/**
 * 页面访问日志数据访问层，对应 page_visit_log 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface PageVisitLogMapper {

    /** 插入一条访问日志 */
    int insert(PageVisitLog log);

    /** 回填地理位置信息到访问日志 */
    int updateGeo(@Param("id") Long id,
                  @Param("country") String country,
                  @Param("region") String region,
                  @Param("city") String city);

    /** 统计指定时间窗口内独立 IP 数（UV） */
    long countUniqueIp(@Param("startDay") String startDay);

    /** 按国家分组统计访客数，降序排列 */
    List<Map<String, Object>> countryRank(@Param("startDay") String startDay);

    /** 查找地理位置为空的前 N 条记录，用于兜底批量解析 */
    List<PageVisitLog> findWithoutGeo(@Param("limit") int limit);
}
