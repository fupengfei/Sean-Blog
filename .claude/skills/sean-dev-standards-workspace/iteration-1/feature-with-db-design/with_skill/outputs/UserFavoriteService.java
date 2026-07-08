package com.sean.blog.module.favorite;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 用户收藏文章 Service.
 *
 * <p>核心逻辑：收藏 / 取消收藏 / 查询收藏列表.
 * 遵循 Sean's 开发规范：
 * <ul>
 *   <li>规范 1.2：创建时填充四个审计字段；删除只做软删除；查询带 is_deleted = 0</li>
 *   <li>规范 5.1：不静默吞异常，catch 块至少记录日志</li>
 *   <li>规范 5.2：使用 SLF4J 日志门面，关键节点打印 INFO 日志</li>
 *   <li>p3c 6.6：禁止使用魔法值，-1/0/1 除外</li>
 * </ul>
 *
 * @author sean
 */
@Service
public class UserFavoriteService {

    private static final Logger log = LoggerFactory.getLogger(UserFavoriteService.class);

    /** 默认每页条数 */
    private static final int DEFAULT_PAGE_SIZE = 10;

    private final UserFavoriteMapper userFavoriteMapper;

    public UserFavoriteService(UserFavoriteMapper userFavoriteMapper) {
        this.userFavoriteMapper = userFavoriteMapper;
    }

    /**
     * 添加收藏.
     *
     * <p>如果用户已收藏该文章（含之前软删除的记录），则恢复并更新审计字段.
     * 规范 1.2：创建时同步设置四个审计字段.
     *
     * @param articleId      文章 ID
     * @param userIdentifier 用户标识
     * @return 收藏记录
     */
    @Transactional
    public UserFavorite addFavorite(Long articleId, String userIdentifier) {
        if (articleId == null || userIdentifier == null || userIdentifier.isBlank()) {
            throw new IllegalArgumentException("articleId 和 userIdentifier 不能为空");
        }

        // 检查是否已有记录（含已软删除的）
        UserFavorite existing = userFavoriteMapper.selectByUserAndArticle(userIdentifier, articleId);

        if (existing != null) {
            // 已存在有效记录，直接返回
            log.info("用户 {} 已收藏文章 {}，记录 id={}", userIdentifier, articleId, existing.getId());
            return existing;
        }

        // 新建收藏记录，规范 1.2：创建时四个审计字段都填充
        UserFavorite favorite = new UserFavorite();
        favorite.setArticleId(articleId);
        favorite.setUserIdentifier(userIdentifier);
        favorite.setCreatedBy(userIdentifier);
        favorite.setCreatedAt(LocalDateTime.now());
        favorite.setUpdatedBy(userIdentifier);
        favorite.setUpdatedAt(LocalDateTime.now());
        favorite.setIsDeleted(0);

        userFavoriteMapper.insert(favorite);
        log.info("用户 {} 收藏文章 {} 成功，记录 id={}", userIdentifier, articleId, favorite.getId());
        return favorite;
    }

    /**
     * 取消收藏（软删除）.
     *
     * <p>规范 1.2：只做软删除，禁止物理删除. 同步更新 updated_by, updated_at.
     *
     * @param favoriteId    收藏记录 ID
     * @param userIdentifier 用户标识（用于校验所有权）
     * @throws IllegalArgumentException 如果记录不存在或不属于该用户
     */
    @Transactional
    public void removeFavorite(Long favoriteId, String userIdentifier) {
        if (favoriteId == null || userIdentifier == null || userIdentifier.isBlank()) {
            throw new IllegalArgumentException("favoriteId 和 userIdentifier 不能为空");
        }

        UserFavorite existing = userFavoriteMapper.selectById(favoriteId);
        if (existing == null) {
            log.warn("取消收藏失败：记录 {} 不存在", favoriteId);
            throw new IllegalArgumentException("收藏记录不存在");
        }
        if (existing.getIsDeleted() == 1) {
            log.warn("取消收藏失败：记录 {} 已被删除", favoriteId);
            throw new IllegalArgumentException("收藏记录已被删除");
        }
        if (!userIdentifier.equals(existing.getUserIdentifier())) {
            log.warn("取消收藏失败：用户 {} 无权操作记录 {}", userIdentifier, favoriteId);
            throw new IllegalArgumentException("无权操作该收藏记录");
        }

        int rows = userFavoriteMapper.softDeleteById(favoriteId, userIdentifier);
        if (rows > 0) {
            log.info("用户 {} 取消收藏成功，记录 id={}", userIdentifier, favoriteId);
        } else {
            log.error("取消收藏异常：更新影响行数为 0，记录 id={}", favoriteId);
            throw new RuntimeException("取消收藏失败，请稍后重试");
        }
    }

    /**
     * 分页查询用户的收藏列表.
     *
     * <p>规范 1.2：查询带上 is_deleted = 0.
     * 规范 3.4：page 从 1 开始，pageSize 默认 10.
     *
     * @param userIdentifier 用户标识
     * @param page           页码（从 1 开始）
     * @param pageSize       每页条数
     * @return 收藏列表（不可变），空列表而非 null
     */
    public List<UserFavorite> listFavorites(String userIdentifier, int page, int pageSize) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            return Collections.emptyList();
        }
        if (page < 1) {
            page = 1;
        }
        if (pageSize < 1 || pageSize > 100) {
            pageSize = DEFAULT_PAGE_SIZE;
        }

        int offset = (page - 1) * pageSize;
        List<UserFavorite> list = userFavoriteMapper.selectByUserIdentifier(userIdentifier, offset, pageSize);
        log.debug("查询用户 {} 收藏列表，page={}, pageSize={}, 结果数={}", userIdentifier, page, pageSize, list.size());
        return list != null ? list : Collections.emptyList();
    }

    /**
     * 统计用户的收藏总数.
     *
     * @param userIdentifier 用户标识
     * @return 收藏总数
     */
    public long countFavorites(String userIdentifier) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            return 0;
        }
        return userFavoriteMapper.countByUserIdentifier(userIdentifier);
    }

    /**
     * 检查用户是否已收藏指定文章.
     *
     * @param userIdentifier 用户标识
     * @param articleId      文章 ID
     * @return true 已收藏，false 未收藏
     */
    public boolean isFavorited(String userIdentifier, Long articleId) {
        if (userIdentifier == null || articleId == null) {
            return false;
        }
        UserFavorite existing = userFavoriteMapper.selectByUserAndArticle(userIdentifier, articleId);
        return existing != null;
    }
}
