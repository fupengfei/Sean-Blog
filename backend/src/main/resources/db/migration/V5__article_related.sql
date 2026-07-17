-- V5: 文章关联功能

ALTER TABLE t_article
  ADD COLUMN prerequisite_id BIGINT DEFAULT NULL COMMENT '前置文章ID，建议先阅读' AFTER category_id,
  ADD INDEX idx_prerequisite_id (prerequisite_id),
  ADD FOREIGN KEY (prerequisite_id) REFERENCES t_article(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS t_article_related (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
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
