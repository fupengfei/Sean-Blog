package com.sean.blog.module.favorite;

import java.util.List;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * 用户收藏文章 Mapper 接口.
 *
 * <p>所有查询必须带上 is_deleted = 0 条件（规范 1.2：查询规范）.
 * 禁止使用 SELECT *，必须列出具体字段（p3c 6.5）.
 *
 * @author sean
 */
@Mapper
public interface UserFavoriteMapper {

    /**
     * 插入一条收藏记录.
     *
     * <p>规范 1.2：创建时同步设置 created_by, created_at, updated_by, updated_at 四个审计字段.
     *
     * @param favorite 收藏实体
     * @return 影响行数
     */
    int insert(UserFavorite favorite);

    /**
     * 软删除收藏记录（规范 1.2：只做软删除，禁止物理删除）.
     *
     * <p>更新 is_deleted = 1，同步更新 updated_by, updated_at.
     *
     * @param id        收藏记录 ID
     * @param updatedBy 操作人标识
     * @return 影响行数
     */
    int softDeleteById(@Param("id") Long id, @Param("updatedBy") String updatedBy);

    /**
     * 根据用户标识和文章 ID 查询有效收藏记录.
     *
     * <p>规范 1.2：查询带上 is_deleted = 0.
     *
     * @param userIdentifier 用户标识
     * @param articleId      文章 ID
     * @return 收藏记录，不存在时返回 null
     */
    UserFavorite selectByUserAndArticle(@Param("userIdentifier") String userIdentifier,
                                        @Param("articleId") Long articleId);

    /**
     * 分页查询用户的收藏列表.
     *
     * <p>规范 1.2：查询带上 is_deleted = 0.
     *
     * @param userIdentifier 用户标识
     * @param offset         偏移量
     * @param limit          每页条数
     * @return 收藏记录列表
     */
    List<UserFavorite> selectByUserIdentifier(@Param("userIdentifier") String userIdentifier,
                                              @Param("offset") int offset,
                                              @Param("limit") int limit);

    /**
     * 统计用户的收藏总数.
     *
     * <p>规范 1.2：查询带上 is_deleted = 0.
     *
     * @param userIdentifier 用户标识
     * @return 收藏总数
     */
    long countByUserIdentifier(@Param("userIdentifier") String userIdentifier);

    /**
     * 根据 ID 查询收藏记录（用于校验存在性）.
     *
     * @param id 收藏记录 ID
     * @return 收藏记录，不存在时返回 null
     */
    UserFavorite selectById(@Param("id") Long id);
}
