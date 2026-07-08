package com.sean.blog.module.favorite.mapper;

import com.sean.blog.module.favorite.entity.UserFavorite;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface UserFavoriteMapper {

    /**
     * 添加收藏
     */
    int insert(UserFavorite favorite);

    /**
     * 取消收藏
     */
    int deleteByVisitorAndArticle(@Param("visitorId") String visitorId, @Param("articleId") Long articleId);

    /**
     * 查询某访客的所有收藏（关联文章摘要信息）
     */
    List<UserFavorite> findByVisitorId(@Param("visitorId") String visitorId);

    /**
     * 检查某篇文章是否已被该访客收藏
     */
    boolean existsByVisitorAndArticle(@Param("visitorId") String visitorId, @Param("articleId") Long articleId);

    /**
     * 查询某访客的收藏数量
     */
    long countByVisitorId(@Param("visitorId") String visitorId);

    /**
     * 删除某访客的所有收藏（清空收藏列表）
     */
    int deleteAllByVisitorId(@Param("visitorId") String visitorId);
}
