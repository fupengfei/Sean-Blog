-- =============================================================================
-- V3: 访问统计表结构
-- =============================================================================
-- 新增三张表用于网站访问统计分析：
--   1. t_page_view_stat  — 按日聚合的 PV 数据（定时作业清理，保留 365 天）
--   2. t_page_visit_log  — 访问明细日志（定时作业清理，保留 90 天）
--   3. t_geo_ip_cache     — IP 地理位置查询缓存（避免重复调用外部 GeoIP API）
-- =============================================================================

-- -----------------------------------------------------------------------------
-- t_page_view_stat: 按日聚合的页面浏览量统计
-- 唯一约束 (page_type, page_key, day) 保证同一天同一页面只有一条记录
-- 使用 INSERT ... ON DUPLICATE KEY UPDATE 实现 upsert 累加计数
-- 数据保留 365 天，通过定时任务清理过期数据
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_page_view_stat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_type VARCHAR(32) NOT NULL,                     -- 页面类型：ARTICLE / PROJECT / SKILL 等
    page_key VARCHAR(128) NOT NULL DEFAULT '',          -- 页面标识：文章 slug / 项目 ID 等
    day DATE NOT NULL,                                  -- 统计日期
    cnt BIGINT NOT NULL DEFAULT 0,                      -- 当日 PV 计数
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_page_day (page_type, page_key, day)   -- 防止同一天重复统计
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_page_visit_log: 访问明细日志表
-- 记录每次页面访问的详细信息（IP、地理位置）
-- 索引设计：idx_page 用于按页面查询，idx_visited_at 用于时间范围查询和定时清理
-- idx_country 用于按国家/地区聚合统计
-- 数据保留 90 天，通过定时任务清理过期数据
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_page_visit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_type VARCHAR(32) NOT NULL,                     -- 页面类型
    page_key VARCHAR(128) NOT NULL DEFAULT '',          -- 页面标识
    ip VARCHAR(45) NOT NULL,                            -- 访问者 IP（支持 IPv4 和 IPv6）
    country VARCHAR(64),                                -- 国家（由 IP 地理位置解析）
    region VARCHAR(64),                                 -- 地区/省份
    city VARCHAR(64),                                   -- 城市
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,  -- 访问时间
    INDEX idx_page (page_type, page_key),               -- 按页面查询索引
    INDEX idx_visited_at (visited_at),                  -- 按时间查询索引（用于定时清理）
    INDEX idx_country (country)                         -- 按国家聚合索引
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- t_geo_ip_cache: IP 地理位置缓存表
-- 避免每次访问都调用外部 GeoIP 服务，通过 IP 唯一约束实现查询缓存
-- 独立于访问日志存储，同一 IP 的多次访问只解析一次
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS t_geo_ip_cache (
    ip VARCHAR(45) NOT NULL,                            -- 客户端 IP（主键）
    country VARCHAR(64),                                -- 国家
    region VARCHAR(64),                                 -- 地区/省份
    city VARCHAR(64),                                   -- 城市
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- 最后一次查询时间
    UNIQUE KEY uk_ip (ip)                               -- IP 唯一约束
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
