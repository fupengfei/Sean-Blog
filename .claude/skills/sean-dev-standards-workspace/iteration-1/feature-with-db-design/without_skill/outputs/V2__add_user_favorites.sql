-- V2: 用户收藏文章功能

CREATE TABLE IF NOT EXISTS t_user_favorite (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    visitor_id VARCHAR(64) NOT NULL COMMENT '访客标识（前端生成 UUID，存 localStorage，无需注册）',
    article_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    UNIQUE KEY uk_visitor_article (visitor_id, article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 为 visitor_id 创建索引，加速按访客查询收藏列表
CREATE INDEX idx_visitor_id ON t_user_favorite(visitor_id);
