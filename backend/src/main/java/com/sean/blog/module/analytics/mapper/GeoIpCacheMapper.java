package com.sean.blog.module.analytics.mapper;

import com.sean.blog.module.analytics.entity.GeoIpCache;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface GeoIpCacheMapper {

    GeoIpCache findByIp(@Param("ip") String ip);

    int insert(GeoIpCache cache);

    int deleteOlderThan(@Param("cutoff") String cutoff);
}
