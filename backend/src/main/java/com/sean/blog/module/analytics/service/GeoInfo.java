package com.sean.blog.module.analytics.service;

/**
 * IP 地理位置信息 record，支持 Redis 字符串序列化。
 * 使用 "|||" 作为分隔符进行序列化/反序列化。
 *
 * @param country 国家名称
 * @param region  地区/省份
 * @param city    城市名称
 * @author sean
 */
public record GeoInfo(String country, String region, String city) {

    /** Redis 序列化分隔符 */
    private static final String DELIMITER = "|||";

    /** 本地 IP 标识（127.0.0.1 等） */
    public static final GeoInfo LOCAL = new GeoInfo("Local", null, null);

    /** 未知地理位置（API 调用失败或配额耗尽） */
    public static final GeoInfo UNKNOWN = new GeoInfo(null, null, null);

    /**
     * 序列化为 Redis 字符串: "country|||region|||city"
     */
    @Override
    public String toString() {
        return (country != null ? country : "") + DELIMITER
                + (region != null ? region : "") + DELIMITER
                + (city != null ? city : "");
    }

    /**
     * 从 Redis 字符串反序列化
     */
    public static GeoInfo fromString(String str) {
        if (str == null || str.isEmpty()) return UNKNOWN;
        String[] parts = str.split("\\|\\|\\|", -1);
        if (parts.length < 3) return UNKNOWN;
        String c = parts[0].isEmpty() ? null : parts[0];
        String r = parts[1].isEmpty() ? null : parts[1];
        String ci = parts[2].isEmpty() ? null : parts[2];
        if ("Local".equals(c)) return LOCAL;
        return new GeoInfo(c, r, ci);
    }
}
