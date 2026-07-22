-- =============================================================================
-- V2: 文章表增加作者字段 + 文件目录表增加精选标记
-- =============================================================================
-- 变更内容：
--   1. t_article 增加 author 字段，支持标注文章作者（多作者博客场景）
--   2. t_file_bundle 增加 is_featured 字段，支持首页精选展示 Skill
-- =============================================================================

-- 文章表增加作者字段，可为空（兼容历史数据）
ALTER TABLE t_article
    ADD COLUMN author VARCHAR(100) DEFAULT NULL COMMENT '作者' AFTER excerpt;

-- 文件包表增加精选标记（首页可展示精选 Skill Bundle）
ALTER TABLE t_file_bundle
    ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否精选' AFTER status;
