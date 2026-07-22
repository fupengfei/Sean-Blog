-- =============================================================================
-- Sean's AI World Blog — 数据库 Schema 参考
-- =============================================================================
-- 注意：此文件仅为参考用的完整表结构快照，不是数据库迁移脚本！
-- 实际的数据库变更通过 Flyway 管理，迁移脚本位于 db/migration/ 目录下：
--   V1__init_schema.sql         — 初始表结构
--   V2__add_author_column.sql   — 作者字段 + 精选标记
--   V3__analytics.sql            — 访问统计
--   V4__add_contact_content.sql  — 联系记录扩展
--   V5__article_related.sql      — 文章关联
--   V7__add_publish_date.sql     — 自定义发布日期
-- 请勿手动执行此文件，应通过 Flyway 自动迁移。
-- =============================================================================

CREATE TABLE IF NOT EXISTS t_admin_user (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_category (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_tag (
    id BIGINT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    slug VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_article (
    id BIGINT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL UNIQUE,
    content_md LONGTEXT,
    content_html LONGTEXT,
    excerpt VARCHAR(500),
    author VARCHAR(100) DEFAULT NULL COMMENT '作者',
    publish_date DATE DEFAULT NULL COMMENT '用户自定义发布日期，页面展示用',
    cover_image VARCHAR(500),
    category_id BIGINT,
    prerequisite_id BIGINT COMMENT '前置文章ID，建议先阅读',
    next_article_id BIGINT DEFAULT NULL COMMENT '下一篇推荐文章ID，管理员手动配置',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    view_count BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES t_category(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_article_tag (
    id BIGINT PRIMARY KEY,
    article_id BIGINT NOT NULL,
    tag_id BIGINT NOT NULL,
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES t_tag(id) ON DELETE CASCADE,
    UNIQUE KEY uk_article_tag (article_id, tag_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_project (
    id BIGINT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    url VARCHAR(500),
    github_url VARCHAR(500),
    cover_image VARCHAR(500),
    tags JSON,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_file_bundle (
    id BIGINT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(500),
    root_path VARCHAR(500) NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'SKILL',
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否精选',
    file_count INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_file_node (
    id BIGINT PRIMARY KEY,
    bundle_id BIGINT NOT NULL,
    parent_id BIGINT,
    name VARCHAR(255) NOT NULL,
    node_type VARCHAR(10) NOT NULL COMMENT 'DIRECTORY / FILE',
    file_path VARCHAR(500),
    file_size BIGINT DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    FOREIGN KEY (bundle_id) REFERENCES t_file_bundle(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES t_file_node(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_contact_record (
    id BIGINT PRIMARY KEY,
    type VARCHAR(10) NOT NULL COMMENT 'BUSINESS / MAIL / RESUME / SUBSCRIBE',
    content TEXT COMMENT '消息内容',
    company_name VARCHAR(200),
    email VARCHAR(200),
    ip_address VARCHAR(50),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_page_view_stat (
    id BIGINT PRIMARY KEY,
    page_type VARCHAR(32) NOT NULL,
    page_key VARCHAR(128) NOT NULL DEFAULT '',
    day DATE NOT NULL,
    cnt BIGINT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_page_day (page_type, page_key, day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_page_visit_log (
    id BIGINT PRIMARY KEY,
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

CREATE TABLE IF NOT EXISTS t_geo_ip_cache (
    ip VARCHAR(45) NOT NULL,
    country VARCHAR(64),
    region VARCHAR(64),
    city VARCHAR(64),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS t_article_related (
    id BIGINT PRIMARY KEY,
    article_id BIGINT NOT NULL COMMENT '文章A',
    related_article_id BIGINT NOT NULL COMMENT '文章B',
    created_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '创建人',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '修改人',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除 0=正常 1=已删除',
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_article_id (article_id),
    INDEX idx_related_article_id (related_article_id),
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (related_article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    UNIQUE KEY uk_pair (article_id, related_article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
