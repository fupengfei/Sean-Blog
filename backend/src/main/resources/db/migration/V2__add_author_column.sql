-- V2: 文章表增加作者字段 + 文件目录表增加精选标记

ALTER TABLE t_article
    ADD COLUMN author VARCHAR(100) DEFAULT NULL COMMENT '作者' AFTER excerpt;

ALTER TABLE t_file_bundle
    ADD COLUMN is_featured TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否精选' AFTER status;
