package com.sean.blog.module.analytics.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.analytics.dto.*;
import com.sean.blog.module.analytics.entity.PageVisitLog;
import com.sean.blog.module.analytics.mapper.PageViewStatMapper;
import com.sean.blog.module.analytics.mapper.PageVisitLogMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PageViewService {

    private static final Logger log = LoggerFactory.getLogger(PageViewService.class);
    private static final Set<String> VALID_PAGE_TYPES = Set.of(
            "home", "blog_list", "blog_detail", "projects", "about", "skills", "skills_detail"
    );

    private static final String PV_KEY_PREFIX = "pv:";
    private static final String RATE_KEY_PREFIX = "rate:";

    private final RedisTemplate<String, Object> redisTemplate;
    private final PageViewStatMapper pageViewStatMapper;
    private final PageVisitLogMapper pageVisitLogMapper;
    private final GeoLocationService geoLocationService;
    private final SnowflakeIdGenerator idGenerator;

    public PageViewService(RedisTemplate<String, Object> redisTemplate,
                           PageViewStatMapper pageViewStatMapper,
                           PageVisitLogMapper pageVisitLogMapper,
                           GeoLocationService geoLocationService,
                           SnowflakeIdGenerator idGenerator) {
        this.redisTemplate = redisTemplate;
        this.pageViewStatMapper = pageViewStatMapper;
        this.pageVisitLogMapper = pageVisitLogMapper;
        this.geoLocationService = geoLocationService;
        this.idGenerator = idGenerator;
    }

    // -----------------------------------------------------------------------
    // 记录 PV
    // -----------------------------------------------------------------------

    public void record(String pageType, String pageKey, String ip) {
        // 参数校验
        if (pageType == null || !VALID_PAGE_TYPES.contains(pageType)) {
            throw new BusinessException(400, "无效的 pageType: " + pageType);
        }
        if (pageKey == null) pageKey = "";
        if (pageKey.length() > 128) {
            throw new BusinessException(400, "pageKey 长度不能超过 128");
        }

        // Redis INCR
        String redisKey = PV_KEY_PREFIX + pageType + ":" + pageKey;
        redisTemplate.opsForValue().increment(redisKey);

        // 异步插入访问日志 + 地理位置解析
        PageVisitLog logEntry = new PageVisitLog();
        logEntry.setId(idGenerator.nextId());
        logEntry.setPageType(pageType);
        logEntry.setPageKey(pageKey);
        logEntry.setIp(ip != null ? ip : "unknown");
        pageVisitLogMapper.insert(logEntry);

        geoLocationService.resolveAsync(ip, logEntry.getId());
    }

    // -----------------------------------------------------------------------
    // 限流检查
    // -----------------------------------------------------------------------

    public boolean checkRateLimit(String ip) {
        String minuteKey = RATE_KEY_PREFIX + ip + ":" +
                LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE) + ":" +
                (System.currentTimeMillis() / 60000);
        Long count = redisTemplate.opsForValue().increment(minuteKey);
        if (count != null && count == 1) {
            redisTemplate.expire(minuteKey, 2, java.util.concurrent.TimeUnit.MINUTES);
        }
        return count != null && count <= 30;
    }

    // -----------------------------------------------------------------------
    // 刷盘：Redis → MySQL
    // -----------------------------------------------------------------------

    @Scheduled(fixedDelay = 300000) // 每 5 分钟
    public void flushToDatabase() {
        try {
            String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
            ScanOptions options = ScanOptions.scanOptions()
                    .match(PV_KEY_PREFIX + "*")
                    .count(100)
                    .build();

            // 使用 SCAN + GETDEL 原子操作
            Set<String> keys = new HashSet<>();
            try (Cursor<String> cursor = redisTemplate.scan(options)) {
                while (cursor.hasNext()) {
                    keys.add(cursor.next());
                }
            }

            for (String key : keys) {
                try {
                    Object value = redisTemplate.opsForValue().getAndDelete(key);
                    long delta = toLong(value);
                    if (delta > 0) {
                        // 解析 key: "pv:pageType:pageKey"
                        String rest = key.substring(PV_KEY_PREFIX.length());
                        int colonIdx = rest.indexOf(':');
                        if (colonIdx <= 0) continue;
                        String pageType = rest.substring(0, colonIdx);
                        String pageKey = rest.substring(colonIdx + 1);

                        pageViewStatMapper.upsert(idGenerator.nextId(), pageType, pageKey, today, delta);
                    }
                } catch (Exception e) {
                    log.debug("Flush key {} failed: {}", key, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("PV flush scan failed: {}", e.getMessage());
        }
    }

    // -----------------------------------------------------------------------
    // 统计查询
    // -----------------------------------------------------------------------

    public List<PageViewStatVO> getRanking(String window, String pageType) {
        int days = parseWindow(window);
        String startDay = LocalDate.now().minusDays(days).format(DateTimeFormatter.ISO_LOCAL_DATE);

        List<Map<String, Object>> rows = pageViewStatMapper.rankByWindow(startDay, pageType);
        return rows.stream()
                .map(row -> new PageViewStatVO(
                        (String) row.get("pageType"),
                        (String) row.get("pageKey"),
                        null, // name 暂不 join，个人博客页面少
                        toLong(row.get("cnt"))))
                .collect(Collectors.toList());
    }

    public List<PageViewTrendVO> getTrend(int days) {
        List<Map<String, Object>> rows = pageViewStatMapper.trendByDays(days);

        // 按 day 分组
        Map<String, Map<String, Long>> dayMap = new LinkedHashMap<>();
        for (int i = days; i >= 0; i--) {
            String d = LocalDate.now().minusDays(i).format(DateTimeFormatter.ISO_LOCAL_DATE);
            dayMap.put(d, new HashMap<>());
        }

        for (Map<String, Object> row : rows) {
            String day = row.get("day") != null ? row.get("day").toString() : null;
            String pt = (String) row.get("pageType");
            Long cnt = toLong(row.get("cnt"));
            if (day != null && dayMap.containsKey(day)) {
                dayMap.get(day).put(pt, cnt);
            }
        }

        return dayMap.entrySet().stream()
                .map(e -> {
                    Map<String, Long> m = e.getValue();
                    return new PageViewTrendVO(
                            e.getKey(),
                            m.getOrDefault("home", 0L),
                            m.getOrDefault("blog_list", 0L),
                            m.getOrDefault("blog_detail", 0L),
                            m.getOrDefault("projects", 0L),
                            m.getOrDefault("about", 0L),
                            m.getOrDefault("skills", 0L),
                            m.getOrDefault("skills_detail", 0L));
                })
                .collect(Collectors.toList());
    }

    public PageViewSummaryVO getSummary() {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String weekAgo = LocalDate.now().minusDays(7).format(DateTimeFormatter.ISO_LOCAL_DATE);
        String twoWeeksAgo = LocalDate.now().minusDays(14).format(DateTimeFormatter.ISO_LOCAL_DATE);

        Map<String, Object> current = pageViewStatMapper.summaryByWindow(weekAgo);
        Map<String, Object> prev = pageViewStatMapper.summaryByWindowPrev(twoWeeksAgo, weekAgo);

        long totalPv = toLong(current.get("totalPv"));
        long prevTotalPv = toLong(prev.get("totalPv"));

        // 今日 PV
        long todayPv = 0;
        Map<String, Object> todayMap = pageViewStatMapper.summaryByWindow(today);
        if (todayMap != null) {
            todayPv = toLong(todayMap.get("totalPv"));
        }

        double totalDelta = prevTotalPv > 0
                ? (double) (totalPv - prevTotalPv) / prevTotalPv * 100
                : 0;

        return new PageViewSummaryVO(totalPv, todayPv, totalPv, totalDelta, totalDelta);
    }

    public List<CountryStatVO> getVisitorCountries(String window) {
        int days = parseWindow(window);
        String startDay = LocalDate.now().minusDays(days).format(DateTimeFormatter.ISO_LOCAL_DATE);

        List<Map<String, Object>> rows = pageVisitLogMapper.countryRank(startDay);
        long total = rows.stream().mapToLong(r -> toLong(r.get("cnt"))).sum();

        return rows.stream()
                .map(row -> {
                    long cnt = toLong(row.get("cnt"));
                    double pct = total > 0 ? (double) cnt / total * 100 : 0;
                    return new CountryStatVO(
                            (String) row.get("country"),
                            cnt,
                            Math.round(pct * 10.0) / 10.0);
                })
                .collect(Collectors.toList());
    }

    public VisitorSummaryVO getVisitorSummary() {
        String today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE);
        String weekAgo = LocalDate.now().minusDays(7).format(DateTimeFormatter.ISO_LOCAL_DATE);

        long totalUv = pageVisitLogMapper.countUniqueIp(weekAgo);
        long todayUv = pageVisitLogMapper.countUniqueIp(today);

        return new VisitorSummaryVO(totalUv, todayUv, totalUv);
    }

    // -----------------------------------------------------------------------
    // 工具方法
    // -----------------------------------------------------------------------

    private int parseWindow(String window) {
        if (window == null) return 7;
        return switch (window) {
            case "7d" -> 7;
            case "30d" -> 30;
            case "90d" -> 90;
            default -> 7;
        };
    }

    private long toLong(Object obj) {
        if (obj == null) return 0L;
        if (obj instanceof Number num) return num.longValue();
        try {
            return Long.parseLong(obj.toString());
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
