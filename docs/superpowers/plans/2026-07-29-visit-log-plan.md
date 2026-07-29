# 访问明细日志 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Admin 访问统计中增加访问明细视角，包含筛选栏 + 分页表格 + 最近 30 条访客卡片，后端采集 User-Agent 设备信息。

**Architecture:** 底部向上：Flyway 迁移加列 → 实体 + 解析器 → MyBatis 查询 → DTO + Controller → 前端类型 + API → React 组件 → 页面集成。

**Tech Stack:** Java 21, Spring Boot 4.x, MyBatis, Flyway, Next.js 14, TypeScript, Tailwind CSS

## Global Constraints

- 不引入第三方 UA 解析库（纯 Java 正则），不引入图表库
- 不修改前端 postPageView() 调用，不修改 Redis 刷盘机制
- 不涉及 WebSocket、导出功能
- 新组件放在 `components/admin/`，匹配现有项目惯例

---

### Task 1: 数据库迁移 — t_page_visit_log 加设备信息字段

**Files:**
- Create: `backend/src/main/resources/db/migration/V9__add_device_info.sql`

**Interfaces:**
- Produces: `t_page_visit_log` 表新增 `os VARCHAR(32)`, `browser VARCHAR(64)`, `device_type VARCHAR(16)` 三列，全部可空

- [ ] **Step 1: 创建迁移文件**

```sql
-- =============================================================================
-- V9: 访问日志增加设备信息字段
-- =============================================================================
-- 在 t_page_visit_log 中增加操作系统、浏览器、设备类型三个字段，
-- 用于记录每次访问的客户端设备信息（从 User-Agent 解析得出）。
-- 全部可空：历史数据不受影响，没有 UA 的请求（如爬虫）也不受影响。
-- =============================================================================

ALTER TABLE t_page_visit_log
    ADD COLUMN os          VARCHAR(32)  NULL COMMENT '操作系统，如 Windows / macOS / iOS / Android',
    ADD COLUMN browser     VARCHAR(64)  NULL COMMENT '浏览器及版本，如 Chrome 126 / Safari 17',
    ADD COLUMN device_type VARCHAR(16)  NULL COMMENT '设备类型：DESKTOP | MOBILE | TABLET';
```

- [ ] **Step 2: 验证迁移**

```bash
# 启动后检查 Flyway 是否执行了 V9
docker compose up -d mysql
# 等待 Spring Boot 启动后查看日志，确认 V9 执行成功
# 或连入 mysql 验证：
# docker compose exec mysql mysql -u root -p sean_blog -e "DESC t_page_visit_log;"
```

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/resources/db/migration/V9__add_device_info.sql
git commit -m "feat(db): t_page_visit_log 增加 os/browser/device_type 字段"
```

### Task 2: 实体类 PageVisitLog 增加设备字段

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/module/analytics/entity/PageVisitLog.java`

**Interfaces:**
- Consumes: V9 迁移完成后的数据库表结构
- Produces: 实体类新增 `os`, `browser`, `deviceType` 三个 String 字段（Lombok @Data 自动生成 getter/setter）

- [ ] **Step 1: 在实体类中添加三个字段**

编辑 `backend/src/main/java/com/sean/blog/module/analytics/entity/PageVisitLog.java`，在 `city` 字段和 `visitedAt` 字段之间插入：

```java
    /** 操作系统（从 User-Agent 解析） */
    private String os;

    /** 浏览器及版本（从 User-Agent 解析） */
    private String browser;

    /** 设备类型：DESKTOP / MOBILE / TABLET */
    private String deviceType;
```

最终字段顺序为：`id` → `pageType` → `pageKey` → `ip` → `country` → `region` → `city` → `os` → `browser` → `deviceType` → `visitedAt`

- [ ] **Step 2: 编译验证**

```bash
cd backend && mvn clean compile
```

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/java/com/sean/blog/module/analytics/entity/PageVisitLog.java
git commit -m "feat(entity): PageVisitLog 增加 os/browser/deviceType 字段"
```

### Task 3: MyBatis Mapper XML — insert 语句包含新字段

**Files:**
- Modify: `backend/src/main/resources/mapper/PageVisitLogMapper.xml`

**Interfaces:**
- Consumes: Task 2 的实体类新字段
- Produces: `insert` SQL 写入 os/browser/device_type 列

- [ ] **Step 1: 更新 insert 语句**

将 `PageVisitLogMapper.xml` 第 12-15 行的 insert 语句改为：

```xml
    <!-- insert: 插入新的访问日志（包含设备信息） -->
    <insert id="insert">
        INSERT INTO t_page_visit_log (id, page_type, page_key, ip, os, browser, device_type, visited_at)
        VALUES (#{id}, #{pageType}, #{pageKey}, #{ip}, #{os}, #{browser}, #{deviceType}, NOW())
    </insert>
```

- [ ] **Step 2: 编译验证**

```bash
cd backend && mvn clean compile
```

- [ ] **Step 3: 提交**

```bash
git add backend/src/main/resources/mapper/PageVisitLogMapper.xml
git commit -m "feat(mapper): insert 语句包含 os/browser/device_type 字段"
```

### Task 4: PageViewService — User-Agent 解析器

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/module/analytics/service/PageViewService.java`

**Interfaces:**
- Produces: 私有方法 `parseUserAgent(String ua)` 返回 `Map<String, String>` (keys: os, browser, deviceType)
- 修改 `record()` 方法，从 controller 传入 UA 并写入 PageVisitLog

- [ ] **Step 1: 添加 parseUserAgent 私有方法**

在 `PageViewService.java` 的「工具方法」区域（`private long toLong` 附近）添加：

```java
    /**
     * 从 User-Agent 字符串中解析操作系统、浏览器和設備類型。
     * 纯 Java 正则实现，无第三方依赖。
     */
    private Map<String, String> parseUserAgent(String ua) {
        Map<String, String> result = new HashMap<>();
        if (ua == null || ua.isBlank()) return result;

        // --- OS ---
        if (ua.contains("Windows")) {
            result.put("os", "Windows");
        } else if (ua.contains("Mac OS") || ua.contains("Macintosh")) {
            result.put("os", "macOS");
        } else if (ua.contains("iPhone") || ua.contains("iPad") || ua.contains("iPod")) {
            result.put("os", "iOS");
        } else if (ua.contains("Android")) {
            result.put("os", "Android");
        } else if (ua.contains("Linux")) {
            result.put("os", "Linux");
        } else {
            result.put("os", "Unknown");
        }

        // --- Browser ---
        if (ua.contains("Edg/")) {
            result.put("browser", "Edge " + extractVersion(ua, "Edg/"));
        } else if (ua.contains("Chrome/")) {
            result.put("browser", "Chrome " + extractVersion(ua, "Chrome/"));
        } else if (ua.contains("Safari/") && !ua.contains("Chrome")) {
            result.put("browser", "Safari " + extractVersion(ua, "Safari/"));
        } else if (ua.contains("Firefox/")) {
            result.put("browser", "Firefox " + extractVersion(ua, "Firefox/"));
        } else {
            result.put("browser", "Unknown");
        }

        // --- Device Type ---
        if (ua.contains("Tablet") || ua.contains("iPad")) {
            result.put("deviceType", "TABLET");
        } else if (ua.contains("Mobile")) {
            result.put("deviceType", "MOBILE");
        } else {
            result.put("deviceType", "DESKTOP");
        }

        return result;
    }

    /** 从 UA 中提取标识符后的主版本号 */
    private String extractVersion(String ua, String prefix) {
        int idx = ua.indexOf(prefix);
        if (idx < 0) return "";
        String rest = ua.substring(idx + prefix.length());
        int end = 0;
        while (end < rest.length() && (Character.isDigit(rest.charAt(end)) || rest.charAt(end) == '.')) {
            end++;
        }
        String version = rest.substring(0, end);
        // 取主版本号（小数点前部分）
        int dot = version.indexOf('.');
        return dot > 0 ? version.substring(0, dot) : version;
    }
```

- [ ] **Step 2: 修改 record() 方法签名和实现**

将 `record()` 方法签名改为接收 `ua` 参数：

```java
    public void record(String pageType, String pageKey, String ip, String ua) {
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

        // 解析 UA
        Map<String, String> device = parseUserAgent(ua);

        // 异步插入访问日志 + 地理位置解析
        PageVisitLog logEntry = new PageVisitLog();
        logEntry.setId(idGenerator.nextId());
        logEntry.setPageType(pageType);
        logEntry.setPageKey(pageKey);
        logEntry.setIp(ip != null ? ip : "unknown");
        logEntry.setOs(device.get("os"));
        logEntry.setBrowser(device.get("browser"));
        logEntry.setDeviceType(device.get("deviceType"));
        pageVisitLogMapper.insert(logEntry);

        geoLocationService.resolveAsync(ip, logEntry.getId());
    }
```

新增 import（在文件顶部 import 区域）:

```java
import java.util.HashMap;
import java.util.Map;
```

- [ ] **Step 3: 更新 PageViewController 调用方**

修改 `backend/src/main/java/com/sean/blog/module/analytics/controller/PageViewController.java` 第 49 行，传入 UA 头：

```java
        // 原有：
        // pageViewService.record(req.getPageType(), req.getPageKey(), ip);
        // 改为：
        String ua = request.getHeader("User-Agent");
        pageViewService.record(req.getPageType(), req.getPageKey(), ip, ua);
```

- [ ] **Step 4: 编译验证**

```bash
cd backend && mvn clean compile
```

- [ ] **Step 5: 提交**

```bash
git add backend/src/main/java/com/sean/blog/module/analytics/service/PageViewService.java
git add backend/src/main/java/com/sean/blog/module/analytics/controller/PageViewController.java
git commit -m "feat(analytics): User-Agent 解析，记录 os/browser/deviceType 到访问日志"
```

### Task 5: 新增 VisitLogVO DTO + MyBatis 查询 + Controller API

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/analytics/dto/VisitLogVO.java`
- Modify: `backend/src/main/java/com/sean/blog/module/analytics/mapper/PageVisitLogMapper.java`
- Modify: `backend/src/main/resources/mapper/PageVisitLogMapper.xml`
- Modify: `backend/src/main/java/com/sean/blog/module/analytics/service/PageViewService.java`
- Modify: `backend/src/main/java/com/sean/blog/module/analytics/controller/AnalyticsAdminController.java`

**Interfaces:**
- Consumes: Task 2 实体字段、Task 3 Mapper insert 更新
- Produces:
  - `VisitLogVO` DTO（ip, country, region, city, os, browser, deviceType, pageType, pageKey, visitTime）
  - `PageVisitLogMapper.selectVisitLogs(...)` 分页筛选查询
  - `PageVisitLogMapper.countVisitLogs(...)` 计数查询
  - `PageVisitLogMapper.selectRecentVisitLogs(limit)` 最近 N 条查询
  - `PageViewService.getVisitLogs(...)` 返回 `PageResult<VisitLogVO>`
  - `PageViewService.getRecentVisitLogs(limit)` 返回 `List<VisitLogVO>`
  - `GET /api/v1/admin/stats/visit-logs` 和 `GET /api/v1/admin/stats/visit-logs/recent`

- [ ] **Step 1: 创建 VisitLogVO DTO**

创建 `backend/src/main/java/com/sean/blog/module/analytics/dto/VisitLogVO.java`：

```java
package com.sean.blog.module.analytics.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 访问明细日志响应 VO，表示单次页面访问的完整信息。
 *
 * @author sean
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class VisitLogVO {

    /** 访问者 IP */
    private String ip;

    /** 国家 */
    private String country;

    /** 地区/省份 */
    private String region;

    /** 城市 */
    private String city;

    /** 操作系统 */
    private String os;

    /** 浏览器 */
    private String browser;

    /** 设备类型：DESKTOP / MOBILE / TABLET */
    private String deviceType;

    /** 页面类型 */
    private String pageType;

    /** 页面标识 */
    private String pageKey;

    /** 访问时间 */
    private LocalDateTime visitTime;
}
```

- [ ] **Step 2: Mapper 接口新增方法**

在 `PageVisitLogMapper.java` 末尾（`}` 之前）添加：

```java
    /** 分页查询访问明细（支持多条件筛选，按时间倒序） */
    List<VisitLogVO> selectVisitLogs(@Param("startDate") String startDate,
                                     @Param("endDate") String endDate,
                                     @Param("country") String country,
                                     @Param("pageType") String pageType,
                                     @Param("offset") int offset,
                                     @Param("size") int size);

    /** 统计访问明细总数（与 selectVisitLogs 使用相同的筛选条件） */
    int countVisitLogs(@Param("startDate") String startDate,
                       @Param("endDate") String endDate,
                       @Param("country") String country,
                       @Param("pageType") String pageType);

    /** 获取最近 N 条访问记录 */
    List<VisitLogVO> selectRecentVisitLogs(@Param("limit") int limit);
```

别忘了加 import：

```java
import com.sean.blog.module.analytics.dto.VisitLogVO;
```

- [ ] **Step 3: Mapper XML 新增三条 SQL**

在 `PageVisitLogMapper.xml` 的 `</mapper>` 之前添加：

```xml
    <!-- selectVisitLogs: 分页查询访问明细（支持日期/国家/页面类型筛选，按时间倒序） -->
    <select id="selectVisitLogs" resultType="com.sean.blog.module.analytics.dto.VisitLogVO">
        SELECT
            ip,
            country,
            region,
            city,
            os,
            browser,
            device_type AS deviceType,
            page_type    AS pageType,
            page_key     AS pageKey,
            visited_at   AS visitTime
        FROM t_page_visit_log
        WHERE 1=1
        <if test="startDate != null and startDate != ''">
            AND visited_at >= #{startDate}
        </if>
        <if test="endDate != null and endDate != ''">
            AND visited_at &lt; #{endDate}
        </if>
        <if test="country != null and country != ''">
            AND country = #{country}
        </if>
        <if test="pageType != null and pageType != ''">
            AND page_type = #{pageType}
        </if>
        ORDER BY visited_at DESC
        LIMIT #{offset}, #{size}
    </select>

    <!-- countVisitLogs: 计数用，条件同 selectVisitLogs -->
    <select id="countVisitLogs" resultType="int">
        SELECT COUNT(*)
        FROM t_page_visit_log
        WHERE 1=1
        <if test="startDate != null and startDate != ''">
            AND visited_at >= #{startDate}
        </if>
        <if test="endDate != null and endDate != ''">
            AND visited_at &lt; #{endDate}
        </if>
        <if test="country != null and country != ''">
            AND country = #{country}
        </if>
        <if test="pageType != null and pageType != ''">
            AND page_type = #{pageType}
        </if>
    </select>

    <!-- selectRecentVisitLogs: 最近 N 条访问记录（按时间倒序） -->
    <select id="selectRecentVisitLogs" resultType="com.sean.blog.module.analytics.dto.VisitLogVO">
        SELECT
            ip,
            country,
            region,
            city,
            os,
            browser,
            device_type AS deviceType,
            page_type    AS pageType,
            page_key     AS pageKey,
            visited_at   AS visitTime
        FROM t_page_visit_log
        ORDER BY visited_at DESC
        LIMIT #{limit}
    </select>
```

- [ ] **Step 4: PageViewService 新增两个方法**

在 `PageViewService.java` 的 `getVisitorSummary()` 方法后，添加：

```java
    public PageResult<VisitLogVO> getVisitLogs(String startDate, String endDate,
                                                String country, String pageType,
                                                int page, int size) {
        int offset = (page - 1) * size;
        List<VisitLogVO> list = pageVisitLogMapper.selectVisitLogs(
                startDate, endDate, country, pageType, offset, size);
        int total = pageVisitLogMapper.countVisitLogs(startDate, endDate, country, pageType);
        return new PageResult<>(list, total, page, size);
    }

    public List<VisitLogVO> getRecentVisitLogs(int limit) {
        if (limit <= 0) limit = 30;
        if (limit > 50) limit = 50;
        return pageVisitLogMapper.selectRecentVisitLogs(limit);
    }
```

新增 import：

```java
import com.sean.blog.common.PageResult;
```

- [ ] **Step 5: AnalyticsAdminController 新增两个端点**

在 `AnalyticsAdminController.java` 的 `visitorSummary()` 方法后（`}` 之前）添加：

```java
    /**
     * 分页查询访问明细日志。
     *
     * @param startDate 开始日期 YYYY-MM-DD
     * @param endDate   结束日期 YYYY-MM-DD
     * @param country   国家筛选
     * @param pageType  页面类型筛选
     * @param page      页码，默认 1
     * @param size      每页条数，默认 20
     * @return GET /api/v1/admin/stats/visit-logs
     */
    @GetMapping("/visit-logs")
    public Result<PageResult<VisitLogVO>> visitLogs(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) String country,
            @RequestParam(required = false) String pageType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(pageViewService.getVisitLogs(startDate, endDate, country, pageType, page, size));
    }

    /**
     * 获取最近 N 条访客记录（用于统计总览页的最近访客卡片）。
     *
     * @param limit 返回条数，默认 30，最大 50
     * @return GET /api/v1/admin/stats/visit-logs/recent
     */
    @GetMapping("/visit-logs/recent")
    public Result<List<VisitLogVO>> recentVisitLogs(
            @RequestParam(defaultValue = "30") int limit) {
        return Result.success(pageViewService.getRecentVisitLogs(limit));
    }
```

新增 import：

```java
import com.sean.blog.common.PageResult;
```

- [ ] **Step 6: 编译验证**

```bash
cd backend && mvn clean compile
```

- [ ] **Step 7: 提交**

```bash
git add backend/src/main/java/com/sean/blog/module/analytics/dto/VisitLogVO.java
git add backend/src/main/java/com/sean/blog/module/analytics/mapper/PageVisitLogMapper.java
git add backend/src/main/resources/mapper/PageVisitLogMapper.xml
git add backend/src/main/java/com/sean/blog/module/analytics/service/PageViewService.java
git add backend/src/main/java/com/sean/blog/module/analytics/controller/AnalyticsAdminController.java
git commit -m "feat(analytics): 访问明细分页查询 + 最近访客 API"
```

### Task 6: 前端类型定义和 API 函数

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces:
  - `VisitLogVO` 接口类型
  - `VisitLogsParams` 接口类型
  - `getVisitLogs(params)` API 函数
  - `getRecentVisitLogs(limit?)` API 函数

- [ ] **Step 1: 添加 TypeScript 类型**

在 `frontend/src/types/index.ts` 末尾（`VisitorSummaryVO` 之后）添加：

```typescript
/** 访问明细日志（单条记录） */
export interface VisitLogVO {
  ip: string;
  country: string;
  region: string;
  city: string;
  os: string;
  browser: string;
  deviceType: string;
  pageType: string;
  pageKey: string;
  visitTime: string;
}

/** 访问明细查询参数 */
export interface VisitLogsParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  country?: string;
  pageType?: string;
}
```

- [ ] **Step 2: 添加 API 函数**

在 `frontend/src/lib/api.ts` 末尾（`getVisitorSummary` 之后）添加：

```typescript
/** 分页查询访问明细 */
export async function getVisitLogs(params: VisitLogsParams = {}): Promise<PageResult<VisitLogVO>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.size) qs.set('size', String(params.size));
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  if (params.country) qs.set('country', params.country);
  if (params.pageType) qs.set('pageType', params.pageType);
  return requestWithAuth<PageResult<VisitLogVO>>(adminUrl(`/stats/visit-logs?${qs.toString()}`));
}

/** 获取最近 N 条访客记录 */
export async function getRecentVisitLogs(limit: number = 30): Promise<VisitLogVO[]> {
  return requestWithAuth<VisitLogVO[]>(adminUrl(`/stats/visit-logs/recent?limit=${limit}`));
}
```

更新顶部 import，添加 `VisitLogVO` 和 `VisitLogsParams`：

```typescript
import {
  // ... existing imports ...
  VisitLogVO,
  VisitLogsParams,
} from '@/types';
```

- [ ] **Step 3: 构建验证**

```bash
cd frontend && npm run build
```

- [ ] **Step 4: 提交**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): 添加 VisitLogVO 类型和访问明细 API 函数"
```

### Task 7: VisitLogFilters 组件 — 筛选栏

**Files:**
- Create: `frontend/src/components/admin/VisitLogFilters.tsx`

**Interfaces:**
- Produces: React 组件，接收 `onSearch(filters)` 回调和可用国家列表
- Props: `{ countries: string[], onSearch: (filters: VisitLogsParams) => void }`

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/admin/VisitLogFilters.tsx`：

```typescript
'use client';

import { useState } from 'react';
import type { VisitLogsParams } from '@/types';

const PAGE_TYPE_OPTIONS = [
  { value: '', label: '全部页面' },
  { value: 'home', label: '首页' },
  { value: 'blog_list', label: '博客列表' },
  { value: 'blog_detail', label: '文章详情' },
  { value: 'projects', label: '项目' },
  { value: 'about', label: '关于' },
  { value: 'skills', label: 'Skills' },
  { value: 'skills_detail', label: 'Skills详情' },
];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

interface Props {
  countries: string[];
  onSearch: (filters: VisitLogsParams) => void;
}

export default function VisitLogFilters({ countries, onSearch }: Props) {
  const [startDate, setStartDate] = useState(daysAgoStr(7));
  const [endDate, setEndDate] = useState(todayStr());
  const [country, setCountry] = useState('');
  const [pageType, setPageType] = useState('');

  const handleSearch = () => {
    onSearch({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      country: country || undefined,
      pageType: pageType || undefined,
    });
  };

  return (
    <div className="flex flex-wrap items-end gap-3 mb-6">
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">开始日期</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="border border-outline-variant rounded px-3 py-1.5 text-sm bg-surface text-on-surface"
        />
      </div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">结束日期</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="border border-outline-variant rounded px-3 py-1.5 text-sm bg-surface text-on-surface"
        />
      </div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">国家</label>
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border border-outline-variant rounded px-3 py-1.5 text-sm bg-surface text-on-surface"
        >
          <option value="">全部</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-on-surface-variant mb-1">页面</label>
        <select
          value={pageType}
          onChange={(e) => setPageType(e.target.value)}
          className="border border-outline-variant rounded px-3 py-1.5 text-sm bg-surface text-on-surface"
        >
          {PAGE_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <button
        onClick={handleSearch}
        className="px-4 py-1.5 rounded text-sm font-medium bg-primary text-on-primary hover:opacity-90 transition-opacity"
      >
        搜索
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/admin/VisitLogFilters.tsx
git commit -m "feat(frontend): 访问明细筛选栏组件 VisitLogFilters"
```

### Task 8: VisitLogTable 组件 — 分页明细表格

**Files:**
- Create: `frontend/src/components/admin/VisitLogTable.tsx`

**Interfaces:**
- Consumes: `getVisitLogs()` API 函数，`VisitLogVO` 类型
- Produces: 分页表格组件，接收筛选条件，自行管理数据和分页状态

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/admin/VisitLogTable.tsx`：

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { getVisitLogs } from '@/lib/api';
import type { VisitLogVO, VisitLogsParams } from '@/types';

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  blog_list: '博客列表',
  blog_detail: '文章详情',
  projects: '项目',
  about: '关于',
  skills: 'Skills',
  skills_detail: 'Skills详情',
};

const OS_ICONS: Record<string, string> = {
  Windows: '🪟',
  macOS: '🍎',
  iOS: '📱',
  Android: '🤖',
  Linux: '🐧',
};

function formatDevice(os: string, browser: string): string {
  const icon = OS_ICONS[os] || '';
  return [icon, os, browser].filter(Boolean).join(' ');
}

function formatLocation(country: string, region: string, city: string): string {
  const parts = [country, region, city].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
}

function formatTime(iso: string): string {
  // "2026-07-29T14:32:01" → "07-29 14:32"
  if (!iso) return '-';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

interface Props {
  filters: VisitLogsParams;
}

export default function VisitLogTable({ filters }: Props) {
  const [data, setData] = useState<VisitLogVO[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [size] = useState(20);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getVisitLogs({ ...filters, page, size });
      setData(result.list);
      setTotal(result.total);
    } catch {
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, page, size]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / size));

  if (loading) {
    return (
      <div className="bg-surface border border-outline-variant rounded-lg p-6 animate-pulse">
        <div className="h-6 bg-surface-container-high rounded w-32 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 bg-surface-container-high rounded mb-2" />
        ))}
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-surface border border-dashed border-outline-variant rounded-lg p-12 text-center">
        <p className="text-on-surface-variant text-sm">暂无访问记录</p>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-outline-variant rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant bg-surface-container-low">
              <th className="text-left py-3 px-4 text-on-surface-variant font-medium w-[140px]">IP</th>
              <th className="text-left py-3 px-4 text-on-surface-variant font-medium w-[140px]">地区</th>
              <th className="text-left py-3 px-4 text-on-surface-variant font-medium w-[200px]">设备</th>
              <th className="text-left py-3 px-4 text-on-surface-variant font-medium w-[100px]">页面</th>
              <th className="text-right py-3 px-4 text-on-surface-variant font-medium w-[120px]">时间</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
                <td className="py-2.5 px-4 text-on-surface font-mono text-xs">{item.ip}</td>
                <td className="py-2.5 px-4 text-on-surface-variant text-xs">
                  {formatLocation(item.country, item.region, item.city)}
                </td>
                <td className="py-2.5 px-4 text-on-surface-variant text-xs">
                  {formatDevice(item.os, item.browser)}
                </td>
                <td className="py-2.5 px-4 text-on-surface text-xs">
                  {PAGE_TYPE_LABELS[item.pageType] || item.pageType}
                </td>
                <td className="py-2.5 px-4 text-on-surface-variant text-xs text-right font-mono">
                  {formatTime(item.visitTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页器 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
        <span className="text-xs text-on-surface-variant">共 {total.toLocaleString()} 条</span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-2 py-1 text-xs rounded border border-outline-variant text-on-surface-variant
                       disabled:opacity-40 hover:bg-surface-container-low transition-colors"
          >
            &lt;
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter((n) => {
              if (totalPages <= 7) return true;
              return n === 1 || n === totalPages || Math.abs(n - page) <= 1;
            })
            .map((n, i, arr) => (
              <span key={n}>
                {i > 0 && arr[i - 1] !== n - 1 && (
                  <span className="px-1 text-on-surface-variant">...</span>
                )}
                <button
                  onClick={() => setPage(n)}
                  className={`px-2 py-1 text-xs rounded ${
                    n === page
                      ? 'bg-primary text-on-primary'
                      : 'border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                  } transition-colors`}
                >
                  {n}
                </button>
              </span>
            ))}
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="px-2 py-1 text-xs rounded border border-outline-variant text-on-surface-variant
                       disabled:opacity-40 hover:bg-surface-container-low transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/admin/VisitLogTable.tsx
git commit -m "feat(frontend): 访问明细分页表格组件 VisitLogTable"
```

### Task 9: RecentVisitors 组件 — 最近访客卡片

**Files:**
- Create: `frontend/src/components/admin/RecentVisitors.tsx`

**Interfaces:**
- Consumes: `getRecentVisitLogs()` API 函数
- Produces: 紧凑列表卡片，展示最近 30 条访客

- [ ] **Step 1: 创建组件**

创建 `frontend/src/components/admin/RecentVisitors.tsx`：

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getRecentVisitLogs } from '@/lib/api';
import type { VisitLogVO } from '@/types';

const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  blog_list: '博客列表',
  blog_detail: '文章详情',
  projects: '项目',
  about: '关于',
  skills: 'Skills',
  skills_detail: 'Skills详情',
};

const OS_ICONS: Record<string, string> = {
  Windows: '🪟',
  macOS: '🍎',
  iOS: '📱',
  Android: '🤖',
  Linux: '🐧',
};

function formatDevice(os: string, browser: string): string {
  const icon = OS_ICONS[os] || '';
  return [icon, os, browser].filter(Boolean).join(' ');
}

function formatLocation(country: string, region: string, city: string): string {
  const parts = [country, region, city].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '-';
}

function formatTime(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${min}`;
}

export default function RecentVisitors() {
  const [items, setItems] = useState<VisitLogVO[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentVisitLogs(30)
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-surface border border-outline-variant rounded-lg p-6 animate-pulse">
        <div className="h-5 bg-surface-container-high rounded w-24 mb-4" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-6 bg-surface-container-high rounded mb-1.5" />
        ))}
      </div>
    );
  }

  if (!items.length) {
    return null;
  }

  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-6">
      <h2 className="text-lg font-display font-semibold text-on-surface mb-4">最近访客</h2>
      <div className="space-y-1">
        {items.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center gap-3 py-1.5 text-xs text-on-surface-variant border-b border-outline-variant/30 last:border-b-0"
          >
            <span className="font-mono w-[120px] truncate" title={item.ip}>{item.ip}</span>
            <span className="w-[120px] truncate">{formatLocation(item.country, item.region, item.city)}</span>
            <span className="w-[180px] truncate">{formatDevice(item.os, item.browser)}</span>
            <span className="w-[80px] truncate">{PAGE_TYPE_LABELS[item.pageType] || item.pageType}</span>
            <span className="font-mono ml-auto">{formatTime(item.visitTime)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 构建验证**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/components/admin/RecentVisitors.tsx
git commit -m "feat(frontend): 最近访客卡片组件 RecentVisitors"
```

### Task 10: Analytics 页面集成 — Tab 切换 + 组件整合

**Files:**
- Modify: `frontend/src/app/admin/analytics/page.tsx`

**Interfaces:**
- Consumes: `VisitLogFilters`, `VisitLogTable`, `RecentVisitors` 组件 + 已有统计子组件
- Produces: 带 Tab 切换的完整 analytics 页面

- [ ] **Step 1: 重构 analytics 页面**

替换 `frontend/src/app/admin/analytics/page.tsx` 完整内容：

```typescript
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  getPageViewRanking,
  getPageViewTrend,
  getPageViewSummary,
  getVisitorCountries,
  getVisitorSummary,
} from '@/lib/api';
import type {
  PageViewStatVO,
  PageViewTrendVO,
  PageViewSummaryVO,
  CountryStatVO,
  VisitorSummaryVO,
  VisitLogsParams,
} from '@/types';
import VisitLogFilters from '@/components/admin/VisitLogFilters';
import VisitLogTable from '@/components/admin/VisitLogTable';
import RecentVisitors from '@/components/admin/RecentVisitors';

// ---------------------------------------------------------------------------
// 页面类型 → 中文名映射
// ---------------------------------------------------------------------------
const PAGE_TYPE_LABELS: Record<string, string> = {
  home: '首页',
  blog_list: '博客列表',
  blog_detail: '博客详情',
  projects: '项目展示',
  about: '关于我',
  skills: 'Skill 列表',
  skills_detail: 'Skill 详情',
};

// ---------------------------------------------------------------------------
// 子组件：StatCard、TrendChart、RankingTable、CountryTable
// （与现有代码完全一致，此处省略注释）
// ---------------------------------------------------------------------------

function StatCard({ title, value, delta }: { title: string; value: number; delta?: number }) {
  return (
    <div className="bg-surface border border-outline-variant rounded-lg p-6">
      <p className="text-sm text-on-surface-variant mb-2">{title}</p>
      <p className="text-3xl font-display font-bold text-primary">{value.toLocaleString()}</p>
      {delta !== undefined && delta !== 0 && (
        <p className={`text-xs mt-1 ${delta > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {delta > 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}% 环比
        </p>
      )}
    </div>
  );
}

function TrendChart({ data }: { data: PageViewTrendVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无趋势数据</p>;

  const maxVal = Math.max(
    1,
    ...data.map((d) =>
      Math.max(d.home, d.blogList, d.blogDetail, d.projects, d.about, d.skills, d.skillsDetail),
    ),
  );

  const lines = [
    { key: 'home', label: '首页', color: 'bg-blue-500' },
    { key: 'blogList', label: '博客列表', color: 'bg-emerald-500' },
    { key: 'blogDetail', label: '博客详情', color: 'bg-violet-500' },
    { key: 'projects', label: '项目', color: 'bg-amber-500' },
    { key: 'about', label: '关于', color: 'bg-rose-500' },
    { key: 'skills', label: 'Skill', color: 'bg-cyan-500' },
    { key: 'skillsDetail', label: 'Skill详情', color: 'bg-indigo-500' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        {lines.map((l) => (
          <div key={l.key} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${l.color}`} />
            <span className="text-xs text-on-surface-variant">{l.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-0.5 h-48">
        {data.map((day) => (
          <div key={day.day} className="flex-1 flex flex-col items-center min-w-0">
            <div className="w-full flex flex-col-reverse" style={{ height: 160 }}>
              {lines.map((l) => {
                const val = (day as unknown as Record<string, number>)[l.key] || 0;
                const h = maxVal > 0 ? (val / maxVal) * 160 : 0;
                return <div key={l.key} className={`w-full ${l.color}`} style={{ height: h, minHeight: val > 0 ? 2 : 0 }} />;
              })}
            </div>
            <span className="text-[10px] text-on-surface-variant mt-1 truncate w-full text-center">
              {day.day.slice(5)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingTable({ data }: { data: PageViewStatVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无排行数据</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant">
            <th className="text-left py-2 px-3 text-on-surface-variant font-medium">页面类型</th>
            <th className="text-left py-2 px-3 text-on-surface-variant font-medium">标识</th>
            <th className="text-right py-2 px-3 text-on-surface-variant font-medium">访问量</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-b border-outline-variant/50 hover:bg-surface-container-low">
              <td className="py-2 px-3 text-on-surface">{PAGE_TYPE_LABELS[item.pageType] || item.pageType}</td>
              <td className="py-2 px-3 text-on-surface-variant font-mono text-xs max-w-[200px] truncate">
                {item.pageKey || '-'}
              </td>
              <td className="py-2 px-3 text-on-surface text-right font-medium">{item.cnt.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CountryTable({ data }: { data: CountryStatVO[] }) {
  if (!data.length) return <p className="text-on-surface-variant text-sm py-8 text-center">暂无访客数据</p>;

  const maxCnt = data[0]?.cnt || 1;

  return (
    <div>
      {data.map((item) => (
        <div key={item.country} className="flex items-center gap-3 py-2 border-b border-outline-variant/50">
          <span className="text-sm text-on-surface w-20 truncate">{item.country}</span>
          <div className="flex-1 bg-surface-container-low rounded-full h-4 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all"
              style={{ width: `${(item.cnt / maxCnt) * 100}%` }}
            />
          </div>
          <span className="text-sm text-on-surface-variant w-20 text-right">
            {item.cnt.toLocaleString()} ({item.percentage}%)
          </span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 访问统计页（/admin/analytics）
// ---------------------------------------------------------------------------

type Tab = 'overview' | 'logs';

export default function AdminAnalyticsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get('tab');
  const activeTab: Tab = tabParam === 'logs' ? 'logs' : 'overview';

  const setTab = (tab: Tab) => {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === 'logs') {
      params.set('tab', 'logs');
    } else {
      params.delete('tab');
    }
    const qs = params.toString();
    router.replace(`/admin/analytics${qs ? `?${qs}` : ''}`, { scroll: false });
  };

  const [window, setWindow] = useState<'7d' | '30d'>('7d');
  const [trendDays, setTrendDays] = useState(7);

  const [summary, setSummary] = useState<PageViewSummaryVO | null>(null);
  const [trend, setTrend] = useState<PageViewTrendVO[]>([]);
  const [ranking, setRanking] = useState<PageViewStatVO[]>([]);
  const [countries, setCountries] = useState<CountryStatVO[]>([]);
  const [visitorSummary, setVisitorSummary] = useState<VisitorSummaryVO | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 访问明细筛选状态
  const [logFilters, setLogFilters] = useState<VisitLogsParams>({});

  const fetchOverviewData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t, r, c, v] = await Promise.all([
        getPageViewSummary(),
        getPageViewTrend(trendDays),
        getPageViewRanking(window),
        getVisitorCountries(window),
        getVisitorSummary(),
      ]);
      setSummary(s);
      setTrend(t);
      setRanking(r);
      setCountries(c);
      setVisitorSummary(v);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '加载失败';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [window, trendDays]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [fetchOverviewData, activeTab]);

  const handleWindowChange = (w: '7d' | '30d') => {
    setWindow(w);
    setTrendDays(w === '7d' ? 7 : 30);
  };

  return (
    <div>
      {/* 标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-on-surface">访问统计</h1>
        <p className="text-sm text-on-surface-variant mt-1">页面浏览量与访客地理分布分析</p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-0 mb-8 border-b border-outline-variant">
        <button
          onClick={() => setTab('overview')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'overview'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          📊 统计总览
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-5 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${
            activeTab === 'logs'
              ? 'border-primary text-primary'
              : 'border-transparent text-on-surface-variant hover:text-on-surface'
          }`}
        >
          📋 访问明细
        </button>
      </div>

      {/* Tab 内容 */}
      {activeTab === 'overview' && (
        <>
          {/* 错误状态 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
              <span className="text-red-700 text-sm">{error}</span>
              <button onClick={fetchOverviewData} className="text-sm text-red-700 underline">重试</button>
            </div>
          )}

          {/* 加载状态 */}
          {loading && !summary && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-surface border border-outline-variant rounded-lg p-6 animate-pulse">
                    <div className="h-4 bg-surface-container-high rounded w-16 mb-3" />
                    <div className="h-8 bg-surface-container-high rounded w-24" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 时间窗口切换 */}
          <div className="flex gap-2 mb-6">
            {(['7d', '30d'] as const).map((w) => (
              <button
                key={w}
                onClick={() => handleWindowChange(w)}
                className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                  window === w
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface border border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {w === '7d' ? '近 7 天' : '近 30 天'}
              </button>
            ))}
          </div>

          {/* 数据展示 */}
          {summary && (
            <>
              {/* 统计卡片 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                <StatCard title="总 PV" value={summary.totalPv} delta={summary.totalDelta} />
                <StatCard title="本周 PV" value={summary.weekPv} delta={summary.weekDelta} />
                <StatCard title="今日 PV" value={summary.todayPv} />
              </div>

              {visitorSummary && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                  <StatCard title="总 UV" value={visitorSummary.totalUv} />
                  <StatCard title="本周 UV" value={visitorSummary.weekUv} />
                  <StatCard title="今日 UV" value={visitorSummary.todayUv} />
                </div>
              )}

              <div className="bg-surface border border-outline-variant rounded-lg p-6 mb-8">
                <h2 className="text-lg font-display font-semibold text-on-surface mb-4">每日 PV 趋势</h2>
                <TrendChart data={trend} />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                <div className="bg-surface border border-outline-variant rounded-lg p-6">
                  <h2 className="text-lg font-display font-semibold text-on-surface mb-4">页面排行</h2>
                  <RankingTable data={ranking} />
                </div>

                <div className="bg-surface border border-outline-variant rounded-lg p-6">
                  <h2 className="text-lg font-display font-semibold text-on-surface mb-4">访客国家分布</h2>
                  <CountryTable data={countries} />
                </div>
              </div>

              {/* 最近访客卡片 */}
              <RecentVisitors />
            </>
          )}
        </>
      )}

      {activeTab === 'logs' && (
        <div>
          <VisitLogFilters
            countries={countries.map((c) => c.country)}
            onSearch={setLogFilters}
          />
          <VisitLogTable filters={logFilters} />
        </div>
      )}
    </div>
  );
}
```

关键改动：
- 新增 `useSearchParams` / `useRouter` 管理 `?tab=` query param
- 新增 `activeTab` 状态，默认为 `overview`
- `overview` Tab 保持现有所有内容 + 底部加 `<RecentVisitors />`
- `logs` Tab 渲染 `<VisitLogFilters>` + `<VisitLogTable>`
- overview 数据仅在 overview tab 活跃时拉取，避免不必要的请求

- [ ] **Step 2: 构建验证**

```bash
cd frontend && npm run build
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/app/admin/analytics/page.tsx
git commit -m "feat(frontend): Analytics 页面集成 Tab 切换 + 访问明细 + 最近访客"
```

### Task 11: 端到端验证

- [ ] **Step 1: 启动服务**

```bash
docker compose up -d
```

- [ ] **Step 2: 访问前台触发 PV 记录**

打开浏览器访问 `http://localhost:3000`，浏览不同页面（首页、博客列表、文章详情、项目等），确保生成访问数据。

- [ ] **Step 3: 验证 Admin 访问明细页面**

打开 `http://localhost:3000/admin/analytics`：
- 确认「统计总览」Tab 正常显示
- 确认底部出现「最近访客」卡片（30 条）
- 切换到「访问明细」Tab
- 验证筛选功能：修改日期范围、选择国家、选择页面类型，点击搜索
- 验证分页：切换到第 2 页，确认数据变化
- 验证设备信息列显示操作系统和浏览器

- [ ] **Step 4: 验证 API**

```bash
# 分页查询
curl -s http://localhost:8080/api/v1/admin/stats/visit-logs?page=1&size=5 \
  -H "Authorization: Bearer $(curl -s -X POST http://localhost:8080/api/v1/admin/login \
    -H 'Content-Type: application/json' \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')" | jq

# 最近访客
curl -s 'http://localhost:8080/api/v1/admin/stats/visit-logs/recent?limit=5' \
  -H "Authorization: Bearer $TOKEN" | jq
```
