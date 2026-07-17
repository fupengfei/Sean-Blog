ALTER TABLE t_article ADD COLUMN next_article_id BIGINT DEFAULT NULL COMMENT '下一篇推荐文章ID，由管理员手动配置' AFTER prerequisite_id;
