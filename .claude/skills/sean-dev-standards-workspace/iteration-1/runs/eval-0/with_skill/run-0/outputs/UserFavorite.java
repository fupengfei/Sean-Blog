package com.sean.blog.module.favorite;

import java.time.LocalDateTime;

/**
 * 用户收藏文章实体类.
 *
 * <p>对应数据库表 t_user_favorite，遵循 Sean's 开发规范：
 * <ul>
 *   <li>表名使用小写 + 下划线（snake_case），类名使用 UpperCamelCase（p3c 6.5 / 6.1）</li>
 *   <li>包含必备审计字段：createdBy, createdAt, updatedBy, updatedAt, isDeleted（规范 1.1）</li>
 *   <li>POJO 布尔变量不加 is 前缀，使用包装类型 Boolean（p3c 6.1）</li>
 * </ul>
 *
 * @author sean
 */
public class UserFavorite {

    /** 主键 ID */
    private Long id;

    /** 文章 ID，关联 t_article.id */
    private Long articleId;

    /** 用户标识（IP 地址或前端生成的匿名 ID） */
    private String userIdentifier;

    /** 创建人（规范 1.1：审计字段） */
    private String createdBy;

    /** 创建时间（规范 1.1：审计字段） */
    private LocalDateTime createdAt;

    /** 修改人（规范 1.1：审计字段） */
    private String updatedBy;

    /** 修改时间（规范 1.1：审计字段） */
    private LocalDateTime updatedAt;

    /** 是否删除：0=正常, 1=已删除（规范 1.1：软删除标识） */
    private Integer isDeleted;

    // ==================== Getters and Setters ====================

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getArticleId() {
        return articleId;
    }

    public void setArticleId(Long articleId) {
        this.articleId = articleId;
    }

    public String getUserIdentifier() {
        return userIdentifier;
    }

    public void setUserIdentifier(String userIdentifier) {
        this.userIdentifier = userIdentifier;
    }

    public String getCreatedBy() {
        return createdBy;
    }

    public void setCreatedBy(String createdBy) {
        this.createdBy = createdBy;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedBy() {
        return updatedBy;
    }

    public void setUpdatedBy(String updatedBy) {
        this.updatedBy = updatedBy;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public Integer getIsDeleted() {
        return isDeleted;
    }

    public void setIsDeleted(Integer isDeleted) {
        this.isDeleted = isDeleted;
    }

    @Override
    public String toString() {
        return "UserFavorite{"
                + "id=" + id
                + ", articleId=" + articleId
                + ", userIdentifier='" + userIdentifier + '\''
                + ", isDeleted=" + isDeleted
                + '}';
    }
}
