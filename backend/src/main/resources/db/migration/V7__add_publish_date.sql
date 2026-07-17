ALTER TABLE t_article ADD COLUMN publish_date DATE DEFAULT NULL COMMENT '用户自定义发布日期，页面展示用' AFTER author;
