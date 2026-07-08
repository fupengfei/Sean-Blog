-- ============================================================
-- 用户收藏文章表
-- 功能: 用户收藏文章
-- 规范: 遵循 Sean's 开发规范 — 数据库设计规范 (SKILL.md 第1节)
-- ============================================================

CREATE TABLE t_user_favorite (
    -- 主键
    id              BIGINT          NOT NULL AUTO_INCREMENT  COMMENT '主键ID',

    -- 业务字段
    article_id      BIGINT          NOT NULL                  COMMENT '文章ID，关联 t_article.id',
    user_identifier VARCHAR(64)     NOT NULL                  COMMENT '用户标识（IP地址或前端生成的匿名ID）',

    -- 审计字段（规范 1.1：必备审计字段）
    created_by      VARCHAR(64)     NOT NULL                  COMMENT '创建人',
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by      VARCHAR(64)     NOT NULL                  COMMENT '修改人',
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    is_deleted      TINYINT         NOT NULL DEFAULT 0        COMMENT '是否删除（0=正常, 1=已删除）',

    -- 主键
    PRIMARY KEY (id),

    -- 唯一索引：同一用户对同一文章只能有一条有效收藏记录
    UNIQUE KEY uk_user_article (user_identifier, article_id),

    -- 普通索引（规范 1.3：为 is_deleted 建索引，为 created_at 建索引）
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_created_at (created_at),
    INDEX idx_article_id (article_id),
    INDEX idx_user_identifier (user_identifier)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户收藏文章表';
