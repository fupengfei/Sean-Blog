package com.sean.blog.module.favorite.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.favorite.entity.UserFavorite;
import com.sean.blog.module.favorite.service.FavoriteService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/favorites")
public class FavoriteController {

    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }

    /**
     * 获取当前访客的收藏列表
     * GET /api/v1/favorites?visitorId=xxx
     */
    @GetMapping
    public Result<List<UserFavorite>> list(@RequestParam String visitorId) {
        return Result.success(favoriteService.getFavorites(visitorId));
    }

    /**
     * 添加收藏
     * POST /api/v1/favorites
     * Body: { "visitorId": "xxx", "articleId": 123 }
     */
    @PostMapping
    public Result<?> add(@RequestBody Map<String, Object> body) {
        String visitorId = (String) body.get("visitorId");
        Long articleId = body.get("articleId") instanceof Integer
                ? ((Integer) body.get("articleId")).longValue()
                : (Long) body.get("articleId");
        favoriteService.addFavorite(visitorId, articleId);
        return Result.success();
    }

    /**
     * 取消收藏
     * DELETE /api/v1/favorites/{articleId}?visitorId=xxx
     */
    @DeleteMapping("/{articleId}")
    public Result<?> remove(@PathVariable Long articleId, @RequestParam String visitorId) {
        favoriteService.removeFavorite(visitorId, articleId);
        return Result.success();
    }

    /**
     * 检查是否已收藏
     * GET /api/v1/favorites/check?visitorId=xxx&articleId=123
     */
    @GetMapping("/check")
    public Result<Map<String, Boolean>> check(
            @RequestParam String visitorId,
            @RequestParam Long articleId) {
        boolean favorited = favoriteService.isFavorited(visitorId, articleId);
        return Result.success(Map.of("favorited", favorited));
    }

    /**
     * 获取收藏数量
     * GET /api/v1/favorites/count?visitorId=xxx
     */
    @GetMapping("/count")
    public Result<Map<String, Long>> count(@RequestParam String visitorId) {
        return Result.success(Map.of("count", favoriteService.getFavoriteCount(visitorId)));
    }

    /**
     * 清空收藏列表
     * DELETE /api/v1/favorites?visitorId=xxx
     */
    @DeleteMapping
    public Result<?> clear(@RequestParam String visitorId) {
        favoriteService.clearFavorites(visitorId);
        return Result.success();
    }
}
