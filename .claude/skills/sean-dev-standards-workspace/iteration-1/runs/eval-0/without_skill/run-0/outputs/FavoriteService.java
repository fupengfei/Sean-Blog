package com.sean.blog.module.favorite.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.module.favorite.entity.UserFavorite;
import com.sean.blog.module.favorite.mapper.UserFavoriteMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FavoriteService {

    private final UserFavoriteMapper favoriteMapper;

    public FavoriteService(UserFavoriteMapper favoriteMapper) {
        this.favoriteMapper = favoriteMapper;
    }

    /**
     * 添加收藏。同一访客对同一文章不可重复收藏。
     */
    @Transactional
    public void addFavorite(String visitorId, Long articleId) {
        if (visitorId == null || visitorId.isBlank()) {
            throw new BusinessException(400, "访客标识不能为空");
        }
        if (articleId == null) {
            throw new BusinessException(400, "文章 ID 不能为空");
        }
        if (favoriteMapper.existsByVisitorAndArticle(visitorId, articleId)) {
            throw new BusinessException(400, "该文章已在收藏列表中");
        }
        UserFavorite favorite = new UserFavorite();
        favorite.setVisitorId(visitorId);
        favorite.setArticleId(articleId);
        favoriteMapper.insert(favorite);
    }

    /**
     * 取消收藏
     */
    @Transactional
    public void removeFavorite(String visitorId, Long articleId) {
        int rows = favoriteMapper.deleteByVisitorAndArticle(visitorId, articleId);
        if (rows == 0) {
            throw new BusinessException(404, "收藏记录不存在");
        }
    }

    /**
     * 获取访客的全部收藏列表（只返回已发布文章，按收藏时间倒序）
     */
    public List<UserFavorite> getFavorites(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) {
            throw new BusinessException(400, "访客标识不能为空");
        }
        return favoriteMapper.findByVisitorId(visitorId);
    }

    /**
     * 检查某篇文章是否已被收藏
     */
    public boolean isFavorited(String visitorId, Long articleId) {
        if (visitorId == null || visitorId.isBlank()) {
            return false;
        }
        return favoriteMapper.existsByVisitorAndArticle(visitorId, articleId);
    }

    /**
     * 获取收藏数量
     */
    public long getFavoriteCount(String visitorId) {
        if (visitorId == null || visitorId.isBlank()) {
            return 0;
        }
        return favoriteMapper.countByVisitorId(visitorId);
    }

    /**
     * 清空收藏列表
     */
    @Transactional
    public void clearFavorites(String visitorId) {
        favoriteMapper.deleteAllByVisitorId(visitorId);
    }
}
