package com.sean.blog.module.analytics.service;

import com.sean.blog.module.analytics.entity.GeoIpCache;
import com.sean.blog.module.analytics.entity.PageVisitLog;
import com.sean.blog.module.analytics.mapper.GeoIpCacheMapper;
import com.sean.blog.module.analytics.mapper.PageVisitLogMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

@Service
public class GeoLocationService {

    private static final Logger log = LoggerFactory.getLogger(GeoLocationService.class);

    private static final int REDIS_TTL_DAYS = 30;
    private static final int DAILY_API_QUOTA = 1900;

    private final RedisTemplate<String, Object> redisTemplate;
    private final GeoIpCacheMapper geoIpCacheMapper;
    private final PageVisitLogMapper pageVisitLogMapper;
    private final RestTemplate restTemplate;

    public GeoLocationService(RedisTemplate<String, Object> redisTemplate,
                              GeoIpCacheMapper geoIpCacheMapper,
                              PageVisitLogMapper pageVisitLogMapper) {
        this.redisTemplate = redisTemplate;
        this.geoIpCacheMapper = geoIpCacheMapper;
        this.pageVisitLogMapper = pageVisitLogMapper;
        this.restTemplate = new RestTemplate();
    }

    // -----------------------------------------------------------------------
    // 核心三层查询
    // -----------------------------------------------------------------------

    /**
     * 同步解析 IP 地理位置，三层缓存：Redis → MySQL → ipwho.is
     */
    public GeoInfo resolve(String ip) {
        // ① 本地 IP 直接返回
        if (isLocalIp(ip)) {
            return GeoInfo.LOCAL;
        }

        // ② Redis 热缓存
        String redisKey = "geoip:" + ip;
        Object cached = redisTemplate.opsForValue().get(redisKey);
        if (cached instanceof String str && !str.isEmpty()) {
            return GeoInfo.fromString(str);
        }

        // ③ MySQL 持久化缓存
        GeoIpCache dbCache = geoIpCacheMapper.findByIp(ip);
        if (dbCache != null && dbCache.getCountry() != null) {
            GeoInfo geo = new GeoInfo(dbCache.getCountry(), dbCache.getRegion(), dbCache.getCity());
            redisTemplate.opsForValue().set(redisKey, geo.toString(), REDIS_TTL_DAYS, TimeUnit.DAYS);
            return geo;
        }

        // ④ 日配额检查
        String quotaKey = "geoip:daily:" + LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        Long count = redisTemplate.opsForValue().increment(quotaKey);
        if (count == 1) {
            redisTemplate.expire(quotaKey, 25, TimeUnit.HOURS);
        }
        if (count != null && count > DAILY_API_QUOTA) {
            log.warn("GeoIP daily quota exceeded ({}/{}), skipping API call for {}", count, DAILY_API_QUOTA, ip);
            return GeoInfo.UNKNOWN;
        }

        // ⑤ 调用 ipwho.is API
        GeoInfo geo = callIpWhoIs(ip);

        // ⑥ 回填 Redis + MySQL
        redisTemplate.opsForValue().set(redisKey, geo.toString(), REDIS_TTL_DAYS, TimeUnit.DAYS);

        GeoIpCache cache = new GeoIpCache();
        cache.setIp(ip);
        cache.setCountry(geo.country());
        cache.setRegion(geo.region());
        cache.setCity(geo.city());
        geoIpCacheMapper.insert(cache);

        return geo;
    }

    /**
     * 异步解析（不阻塞主流程）
     */
    @Async("geoExecutor")
    public void resolveAsync(String ip, Long logId) {
        try {
            GeoInfo geo = resolve(ip);
            if (geo != GeoInfo.UNKNOWN) {
                pageVisitLogMapper.updateGeo(logId, geo.country(), geo.region(), geo.city());
            }
        } catch (Exception e) {
            log.debug("Async geo resolve failed for ip={}: {}", ip, e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // 定时任务
    // -----------------------------------------------------------------------

    /**
     * 兜底批量处理：每分钟扫描 country IS NULL 的记录并解析
     */
    @Scheduled(fixedDelay = 60000)
    public void batchResolvePending() {
        try {
            List<PageVisitLog> logs = pageVisitLogMapper.findWithoutGeo(50);
            if (logs.isEmpty()) return;

            for (PageVisitLog logItem : logs) {
                try {
                    GeoInfo geo = resolve(logItem.getIp());
                    pageVisitLogMapper.updateGeo(logItem.getId(), geo.country(), geo.region(), geo.city());
                } catch (Exception e) {
                    log.debug("Batch geo resolve failed for id={}: {}", logItem.getId(), e.getMessage());
                }
            }
        } catch (Exception e) {
            log.debug("Batch geo resolve scan failed: {}", e.getMessage());
        }
    }

    /**
     * 月度清理：每月 1 日凌晨 4 点删除 90 天前的缓存记录
     */
    @Scheduled(cron = "0 0 4 1 * ?")
    public void cleanStaleCache() {
        String cutoff = LocalDateTime.now().minusDays(90)
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        int deleted = geoIpCacheMapper.deleteOlderThan(cutoff);
        log.info("GeoIP cache cleanup: {} stale entries deleted", deleted);
    }

    // -----------------------------------------------------------------------
    // 私有方法
    // -----------------------------------------------------------------------

    @SuppressWarnings("unchecked")
    private GeoInfo callIpWhoIs(String ip) {
        try {
            String url = "https://ipwho.is/" + ip + "?fields=status,country,region,city";
            Map<String, Object> response = restTemplate.getForObject(url, Map.class);
            if (response != null && "success".equals(response.get("status"))) {
                String country = (String) response.get("country");
                String region = (String) response.get("region");
                String city = (String) response.get("city");
                return new GeoInfo(country, region, city);
            }
        } catch (Exception e) {
            log.debug("ipwho.is API call failed for {}: {}", ip, e.getMessage());
        }
        return GeoInfo.UNKNOWN;
    }

    private boolean isLocalIp(String ip) {
        if (ip == null) return true;
        if ("127.0.0.1".equals(ip) || "::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) return true;
        if (ip.startsWith("10.")) return true;
        if (ip.startsWith("192.168.")) return true;
        if (ip.startsWith("172.")) {
            try {
                int second = Integer.parseInt(ip.split("\\.")[1]);
                if (second >= 16 && second <= 31) return true;
            } catch (Exception ignored) {}
        }
        return false;
    }
}
