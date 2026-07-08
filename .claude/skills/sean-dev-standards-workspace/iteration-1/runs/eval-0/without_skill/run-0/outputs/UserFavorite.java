package com.sean.blog.module.favorite.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserFavorite {
    private Long id;
    private String visitorId;
    private Long articleId;
    private LocalDateTime createdAt;

    // 关联查询字段：收藏列表页展示文章摘要信息
    private String articleTitle;
    private String articleSlug;
    private String articleExcerpt;
}
