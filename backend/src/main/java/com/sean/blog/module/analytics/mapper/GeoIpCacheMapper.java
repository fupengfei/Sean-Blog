package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.GeoIpCache;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * IP 地理位置缓存数据访问层，对应 geo_ip_cache 相关 SQL 映射。
 *
 * @author sean
 */
@Mapper
public interface GeoIpCacheMapper {

    /** 根据 IP 查询缓存记录 */
    GeoIpCache findByIp(@Param("ip") String ip);

    /** 插入新缓存记录 */
    int insert(GeoIpCache cache);

    /** 删除早于指定时间的过期缓存 */
    int deleteOlderThan(@Param("cutoff") String cutoff);
}
