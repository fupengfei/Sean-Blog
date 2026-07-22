-- =============================================================================
-- V5: 文章关联功能
-- =============================================================================
-- 变更内容：
--   1. t_article 增加 prerequisite_id 字段，支持前置文章（建议先阅读）关联
--   2. 新增 t_article_related 表，实现文章之间的双向关联推荐
--      软删除设计：通过 is_deleted 标记而非物理删除，保留操作记录
--      唯一约束 (article_id, related_article_id) 防止重复关联
-- =============================================================================

-- 文章表增加前置文章关联字段（如系列文章中建议先读的前置篇）
ALTER TABLE t_article
  ADD COLUMN prerequisite_id BIGINT DEFAULT NULL COMMENT '前置文章ID，建议先阅读' AFTER category_id,
  ADD INDEX idx_prerequisite_id (prerequisite_id),     -- 按前置文章查询索引
  ADD FOREIGN KEY (prerequisite_id) REFERENCES t_article(id) ON DELETE SET NULL;  -- 前置文章删除时置空

-- 文章关联推荐表（多对多关联，支持双向推荐）
CREATE TABLE IF NOT EXISTS t_article_related (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT NOT NULL COMMENT '文章A',         -- 关联发起方文章
    related_article_id BIGINT NOT NULL COMMENT '文章B', -- 关联目标方文章
    created_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '创建人',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '修改人',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除 0=正常 1=已删除',  -- 软删除标记
    INDEX idx_is_deleted (is_deleted),                 -- 软删除过滤索引
    INDEX idx_article_id (article_id),                 -- 按文章查询索引
    INDEX idx_related_article_id (related_article_id), -- 按关联文章查询索引
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (related_article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    UNIQUE KEY uk_pair (article_id, related_article_id) -- 防止同一对文章重复关联
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
