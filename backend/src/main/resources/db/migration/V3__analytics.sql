-- V3: 访问统计表结构
-- t_page_view_stat: 按日聚合 PV，保留 365 天
CREATE TABLE IF NOT EXISTS t_page_view_stat (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_type VARCHAR(32) NOT NULL,
    page_key VARCHAR(128) NOT NULL DEFAULT '',
    day DATE NOT NULL,
    cnt BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_page_day (page_type, page_key, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- t_page_visit_log: 访问明细，保留 90 天
CREATE TABLE IF NOT EXISTS t_page_visit_log (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    page_type VARCHAR(32) NOT NULL,
    page_key VARCHAR(128) NOT NULL DEFAULT '',
    ip VARCHAR(45) NOT NULL,
    country VARCHAR(64),
    region VARCHAR(64),
    city VARCHAR(64),
    visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_page (page_type, page_key),
    INDEX idx_visited_at (visited_at),
    INDEX idx_country (country)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- t_geo_ip_cache: IP 地理位置缓存
CREATE TABLE IF NOT EXISTS t_geo_ip_cache (
    ip VARCHAR(45) NOT NULL,
    country VARCHAR(64),
    region VARCHAR(64),
    city VARCHAR(64),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
