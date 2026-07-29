# 访问明细日志 — 设计文档

> 日期：2026-07-29 | 状态：设计阶段

## 1. 背景

当前系统已有一套访问统计基础设施：前端 `PageViewTracker` 上报 PV、后端 Redis 缓冲 + 定时刷 MySQL、Admin 统计页展示聚合数据（PV/UV 卡片、趋势图、排行、国家分布）。(`t_page_visit_log` 表已记录每次访问的 IP、国家、地区、城市、页面类型、时间。)

**缺失能力**：没有设备信息，没有分页查询单条访问记录的 API，前端也没有明细列表页。

## 2. 目标

在 Admin 访问统计模块中，增加**访问明细**视角，展示每次访问的详细记录：IP、设备（OS + 浏览器 + 设备类型）、时间、地区。具体包含：

1. Admin 统计页新增「访问明细」Tab，含筛选栏 + 分页表格
2. 统计总览页底部新增「最近访客」卡片（最近 30 条）
3. 后端新增 User-Agent 解析 + 2 个查询 API

## 3. 数据库变更

### 3.1 表：`t_page_visit_log` — 新增 3 列

```sql
ALTER TABLE t_page_visit_log
  ADD COLUMN os          VARCHAR(32)  NULL COMMENT '操作系统',
  ADD COLUMN browser     VARCHAR(64)  NULL COMMENT '浏览器及版本',
  ADD COLUMN device_type VARCHAR(16)  NULL COMMENT 'DESKTOP | MOBILE | TABLET';
```

- 全部可空：历史数据不受影响，只是没有设备信息
- 已有字段保持不变

### 3.2 迁移文件

`V9__add_device_info.sql`，Flyway 自动执行。

## 4. User-Agent 解析

### 4.1 解析时机

`POST /api/v1/page-views` 收到 PV 上报时，从 HTTP 请求头 `User-Agent` 中解析，结果写入 `t_page_visit_log`。

### 4.2 解析规则（后端纯 Java 正则实现，无第三方依赖）

**操作系统识别**（按 UA 子串匹配）：

| UA 子串 | OS 输出 |
|----------|---------|
| `Windows` | `Windows` |
| `Mac OS` 或 `Macintosh` | `macOS` |
| `iPhone` 或 `iPad` 或 `iPod` | `iOS` |
| `Android` | `Android` |
| `Linux` | `Linux` |
| 其他 | `Unknown` |

**浏览器识别**（版本号取 `/` 后的主版本号）：

| UA 子串 | 浏览器输出 |
|----------|-----------|
| `Edg/` | `Edge {ver}` |
| `Chrome/` | `Chrome {ver}` |
| `Safari/` 且不含 `Chrome` | `Safari {ver}` |
| `Firefox/` | `Firefox {ver}` |
| 其他 | `Unknown` |

**设备类型判断**：

| 条件 | 输出 |
|------|------|
| UA 含 `Mobile` 且不含 `Tablet` | `MOBILE` |
| UA 含 `Tablet` 或 `iPad` | `TABLET` |
| 其他 | `DESKTOP` |

**边界情况：**
- 无 `User-Agent` 头 → 3 个字段均为 `NULL`
- 无法识别的 OS/浏览器 → 输出 `Unknown`
- 前端 fetch 请求自动携带 UA 头，无需前端改动

### 4.3 实现位置

在 `PageViewService` 中新增私有方法 `parseUserAgent(String ua)`，返回包含 `os` / `browser` / `deviceType` 的结果对象。在记录 `PageVisitLog` 时调用。

## 5. 后端 API

新增 2 个 Admin 接口，在 `AnalyticsAdminController` 中扩展，均需 JWT 认证。

### 5.1 分页查询访问明细

```
GET /api/v1/admin/stats/visit-logs
```

**请求参数**（全部可选）：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 否 | 页码，默认 1 |
| `size` | int | 否 | 每页条数，默认 20 |
| `startDate` | string | 否 | 开始日期 `YYYY-MM-DD` |
| `endDate` | string | 否 | 结束日期 `YYYY-MM-DD` |
| `country` | string | 否 | 国家，精确匹配 |
| `pageType` | string | 否 | 页面类型，如 `blog_detail` |

**响应**（`Result<PageResult<VisitLogVO>>`）：

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "ip": "203.0.113.42",
        "country": "中国",
        "region": "北京",
        "city": "北京",
        "os": "macOS",
        "browser": "Chrome 126",
        "deviceType": "DESKTOP",
        "pageType": "blog_detail",
        "pageKey": "my-post-1712345678",
        "visitTime": "2026-07-29T14:32:01"
      }
    ],
    "total": 1523,
    "page": 1,
    "size": 20
  }
}
```

### 5.2 最近访客

```
GET /api/v1/admin/stats/visit-logs/recent?limit=30
```

**请求参数**：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `limit` | int | 否 | 返回条数，默认 30，最大 50 |

**响应**：`Result<List<VisitLogVO>>`，列表结构同上。

### 5.3 DTO：`VisitLogVO`

```java
public class VisitLogVO {
    private String ip;
    private String country;
    private String region;
    private String city;
    private String os;
    private String browser;
    private String deviceType;
    private String pageType;
    private String pageKey;
    private LocalDateTime visitTime;
}
```

### 5.4 MyBatis 查询

`PageVisitLogMapper` 新增 2 个方法：

```java
// 分页查询（支持多条件筛选 + 按时间倒序）
List<VisitLogVO> selectVisitLogs(@Param("startDate") String startDate,
                                  @Param("endDate") String endDate,
                                  @Param("country") String country,
                                  @Param("pageType") String pageType,
                                  @Param("offset") int offset,
                                  @Param("size") int size);
int countVisitLogs(@Param("startDate") String startDate,
                   @Param("endDate") String endDate,
                   @Param("country") String country,
                   @Param("pageType") String pageType);

// 最近 N 条
List<VisitLogVO> selectRecentVisitLogs(@Param("limit") int limit);
```

## 6. 前端设计

### 6.1 页面结构

`/admin/analytics` 页面顶部新增 Tab 切换：

```
┌──────────────────────────────────────────────────────┐
│  [📊 统计总览]   [📋 访问明细]                         │
│                                                       │
│  Tab 内容区（条件渲染）                                 │
│                                                       │
└──────────────────────────────────────────────────────┘
```

- **统计总览 Tab**：保持现有内容（PV/UV 卡片、趋势图、排行表、国家分布）
- **访问明细 Tab**：筛选栏 + 分页表格
- Tab 状态通过 URL query param `?tab=logs` 持久化（支持直接链接）；缺省为统计总览
- 「统计总览」Tab 底部新增「最近访客」横向列表卡片（30 条，紧凑行样式）

### 6.2 访问明细 Tab — 布局

```
┌─ 筛选栏 ──────────────────────────────────────────────┐
│  日期: [2026-07-01] ~ [2026-07-29]                    │
│  国家: [全部 ▼]   页面: [全部 ▼]    [搜索]             │
├─ 明细表格 ────────────────────────────────────────────┤
│  IP            │ 地区       │ 设备            │ 页面    │ 时间         │
│  203.0.113.42  │ 中国 北京  │ macOS Chrome 126│ 文章详情 │ 07-29 14:32 │
│  198.51.100.5  │ 美国      │ iOS Safari 17   │ 首页    │ 07-29 14:28 │
│  10.0.0.1      │ -         │ Windows Edge 126│ 项目页  │ 07-29 14:15 │
├─ 分页器 ──────────────────────────────────────────────┤
│  < 1  2  3 ... 76 >   共 1523 条                       │
└───────────────────────────────────────────────────────┘
```

**表格列定义：**

| 列 | 宽度 | 内容 | 说明 |
|----|------|------|------|
| IP | 140px | `203.0.113.42` | 原始 IP，等宽字体 |
| 地区 | 140px | `中国 北京 北京` | `国家 省份 城市`，缺失字段显示 `-` |
| 设备 | 200px | 🍎 `macOS Chrome 126` | OS + 空格 + 浏览器，图标用 emoji |
| 页面 | 100px | `文章详情` | 中文映射（首页/博客列表/文章详情/项目/关于/Skills/Skills详情） |
| 时间 | 120px | `07-29 14:32` | `MM-DD HH:mm`，24 小时制 |

- 每页默认 20 条
- IP 等宽字体 `font-mono`
- 空数据时显示虚线占位空状态

### 6.3 筛选栏细节

- **日期范围**：两个 `<input type="date">`，默认值为最近 7 天
- **国家下拉**：动态从 `getVisitorCountries` API 获取可选国家列表
- **页面类型下拉**：固定 7 个选项（全部/首页/博客列表/文章详情/项目/关于/Skills/Skills详情）
- **搜索按钮**：点击触发查询（重置 page 为 1）
- 筛选条件为空时也返回数据（不做强制筛选）

### 6.4 最近访客卡片（统计总览 Tab 底部）

```
┌─ 最近访客 ─────────────────────────────────────────────┐
│  IP            地区        设备              页面  时间 │
│  203.0.113.42  中国 北京   macOS Chrome 126  文章详情  │
│  198.51.100.5  美国       iOS Safari 17    首页      │
│  ...（共 30 条，紧凑排列）                               │
└────────────────────────────────────────────────────────┘
```

- 使用现有卡片边框样式（`1px solid #E2E8F0`）
- 不翻页，不显示表头（纯列表）
- 行高紧凑，`text-sm`
- 每行最多展示 5 个字段，超长省略

### 6.5 页面类型映射

前后端共用（前端即为 `PAGE_TYPE_LABELS` 常量字典）：

| pageType | 中文 |
|----------|------|
| `home` | 首页 |
| `blog_list` | 博客列表 |
| `blog_detail` | 文章详情 |
| `projects` | 项目 |
| `about` | 关于 |
| `skills` | Skills |
| `skills_detail` | Skills详情 |

### 6.6 组件拆分

| 组件 | 文件路径 | 职责 |
|------|---------|------|
| `AnalyticsPage` | `admin/analytics/page.tsx` | 页面容器：Tab 状态管理 + 数据获取协调 |
| `VisitLogTable` | `components/admin/VisitLogTable.tsx` | 明细表格 + 分页 |
| `VisitLogFilters` | `components/admin/VisitLogFilters.tsx` | 筛选栏（日期/国家/页面类型） |
| `RecentVisitors` | `components/admin/RecentVisitors.tsx` | 最近 30 条访客卡片 |
| `StatCard` | 已有 | 统计卡片，不动 |
| `TrendChart` | 已有 | 趋势图，不动 |
| `RankingTable` | 已有 | 排行表，不动 |
| `CountryTable` | 已有 | 国家分布表，不动 |

### 6.7 新增类型定义（`types/index.ts`）

```typescript
interface VisitLogVO {
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

interface VisitLogsParams {
  page?: number;
  size?: number;
  startDate?: string;
  endDate?: string;
  country?: string;
  pageType?: string;
}
```

### 6.8 新增 API 函数（`lib/api.ts`）

```typescript
export async function getVisitLogs(params: VisitLogsParams): Promise<PageResult<VisitLogVO>>
export async function getRecentVisitLogs(limit?: number): Promise<VisitLogVO[]>
```

## 7. 变更范围总结

| 层 | 文件 | 变动 |
|----|------|------|
| DB | `V9__add_device_info.sql` | 新增：t_page_visit_log 加 3 列 |
| 后端 | `PageViewService.java` | 新增：`parseUserAgent()` 方法，记录时写新字段 |
| 后端 | `PageVisitLogMapper.java` + XML | 新增：分页查询 + count + 最近 N 条 |
| 后端 | `AnalyticsAdminController.java` | 新增：2 个 GET API |
| 后端 | `VisitLogVO.java` | 新增：DTO |
| 前端 | `types/index.ts` | 新增：`VisitLogVO`、`VisitLogsParams` |
| 前端 | `lib/api.ts` | 新增：`getVisitLogs`、`getRecentVisitLogs` |
| 前端 | `admin/analytics/page.tsx` | 修改：加 Tab 切换 + 汇总数据协调 |
| 前端 | `components/admin/VisitLogTable.tsx` | 新增：明细表格 |
| 前端 | `components/admin/VisitLogFilters.tsx` | 新增：筛选栏 |
| 前端 | `components/admin/RecentVisitors.tsx` | 新增：最近访客卡片 |

## 8. 不在范围内

- 不涉及第三方 UA 解析库（纯 Java 正则）
- 不引入第三方图表库
- 不涉及实时 WebSocket 推送
- 不涉及访问明细的导出功能
- 不修改前端 `postPageView()` 调用逻辑
- 不修改 Redis 缓冲 / 定时刷 MySQL 机制
