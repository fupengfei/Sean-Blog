package com.sean.blog.module.favorite;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 用户收藏文章 Controller —— 公开接口.
 *
 * <p>提供收藏 / 取消收藏 / 查询收藏列表功能，无需认证.
 * 遵循 Sean's 开发规范：
 * <ul>
 *   <li>规范 3.1：RESTful 风格，资源名使用复数名词，URL 使用 kebab-case</li>
 *   <li>规范 3.2：统一返回 Result 结构</li>
 *   <li>规范 3.4：分页参数 page（从 1 开始）、pageSize（默认 10）</li>
 *   <li>规范 5.2：关键业务节点打印 INFO 日志（SLF4J）</li>
 * </ul>
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1")
public class UserFavoriteController {

    private static final Logger log = LoggerFactory.getLogger(UserFavoriteController.class);

    private final UserFavoriteService userFavoriteService;

    public UserFavoriteController(UserFavoriteService userFavoriteService) {
        this.userFavoriteService = userFavoriteService;
    }

    /**
     * 添加收藏.
     *
     * <p>POST /api/v1/favorites
     *
     * @param body 请求体，包含 articleId 和 userIdentifier
     * @return 收藏记录
     */
    @PostMapping("/favorites")
    public Map<String, Object> addFavorite(@RequestBody Map<String, Object> body) {
        Long articleId = toLong(body.get("articleId"));
        String userIdentifier = (String) body.get("userIdentifier");

        if (articleId == null || userIdentifier == null || userIdentifier.isBlank()) {
            log.warn("添加收藏失败：参数不完整，articleId={}, userIdentifier={}", articleId, userIdentifier);
            return buildError(400, "articleId 和 userIdentifier 不能为空");
        }

        try {
            UserFavorite favorite = userFavoriteService.addFavorite(articleId, userIdentifier);
            log.info("POST /api/v1/favorites 成功，id={}", favorite.getId());
            return buildSuccess(favorite);
        } catch (IllegalArgumentException e) {
            log.warn("添加收藏失败：{}", e.getMessage());
            return buildError(400, e.getMessage());
        } catch (Exception e) {
            log.error("添加收藏异常", e);
            return buildError(500, "服务器内部错误");
        }
    }

    /**
     * 取消收藏（软删除）.
     *
     * <p>DELETE /api/v1/favorites/{id}?userIdentifier=xxx
     * 规范 1.2：只做软删除，不物理删除.
     *
     * @param id             收藏记录 ID
     * @param userIdentifier 用户标识（用于校验所有权）
     * @return 操作结果
     */
    @DeleteMapping("/favorites/{id}")
    public Map<String, Object> removeFavorite(@PathVariable Long id,
                                              @RequestParam String userIdentifier) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            log.warn("取消收藏失败：userIdentifier 不能为空");
            return buildError(400, "userIdentifier 不能为空");
        }

        try {
            userFavoriteService.removeFavorite(id, userIdentifier);
            log.info("DELETE /api/v1/favorites/{} 成功，user={}", id, userIdentifier);
            return buildSuccess(null);
        } catch (IllegalArgumentException e) {
            log.warn("取消收藏失败：{}", e.getMessage());
            return buildError(400, e.getMessage());
        } catch (Exception e) {
            log.error("取消收藏异常，id={}", id, e);
            return buildError(500, "服务器内部错误");
        }
    }

    /**
     * 查询用户的收藏列表.
     *
     * <p>GET /api/v1/favorites?userIdentifier=xxx&page=1&pageSize=10
     * 规范 3.4：page 从 1 开始，pageSize 默认 10.
     *
     * @param userIdentifier 用户标识
     * @param page           页码（从 1 开始）
     * @param pageSize       每页条数
     * @return 分页收藏列表
     */
    @GetMapping("/favorites")
    public Map<String, Object> listFavorites(@RequestParam String userIdentifier,
                                             @RequestParam(defaultValue = "1") int page,
                                             @RequestParam(defaultValue = "10") int pageSize) {
        if (userIdentifier == null || userIdentifier.isBlank()) {
            log.warn("查询收藏列表失败：userIdentifier 不能为空");
            return buildError(400, "userIdentifier 不能为空");
        }

        try {
            List<UserFavorite> list = userFavoriteService.listFavorites(userIdentifier, page, pageSize);
            long total = userFavoriteService.countFavorites(userIdentifier);
            log.info("GET /api/v1/favorites 成功，user={}, page={}, pageSize={}, total={}",
                    userIdentifier, page, pageSize, total);

            // 规范 3.2：分页响应结构
            Map<String, Object> data = new HashMap<>();
            data.put("records", list);
            data.put("total", total);
            data.put("page", page);
            data.put("pageSize", pageSize);
            return buildSuccess(data);
        } catch (Exception e) {
            log.error("查询收藏列表异常，user={}", userIdentifier, e);
            return buildError(500, "服务器内部错误");
        }
    }

    /**
     * 检查用户是否已收藏某篇文章.
     *
     * <p>GET /api/v1/favorites/check?userIdentifier=xxx&articleId=123
     *
     * @param userIdentifier 用户标识
     * @param articleId      文章 ID
     * @return { favorited: true/false }
     */
    @GetMapping("/favorites/check")
    public Map<String, Object> checkFavorited(@RequestParam String userIdentifier,
                                              @RequestParam Long articleId) {
        if (userIdentifier == null || userIdentifier.isBlank() || articleId == null) {
            return buildError(400, "userIdentifier 和 articleId 不能为空");
        }

        try {
            boolean favorited = userFavoriteService.isFavorited(userIdentifier, articleId);
            Map<String, Object> data = new HashMap<>();
            data.put("favorited", favorited);
            return buildSuccess(data);
        } catch (Exception e) {
            log.error("检查收藏状态异常，user={}, articleId={}", userIdentifier, articleId, e);
            return buildError(500, "服务器内部错误");
        }
    }

    // ==================== 响应构建工具方法 ====================

    /**
     * 构建成功响应（规范 3.2：统一返回结构）.
     */
    private Map<String, Object> buildSuccess(Object data) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", 200);
        result.put("message", "success");
        result.put("data", data);
        return result;
    }

    /**
     * 构建错误响应（规范 3.3：错误码规范）.
     */
    private Map<String, Object> buildError(int code, String message) {
        Map<String, Object> result = new HashMap<>();
        result.put("code", code);
        result.put("message", message);
        result.put("data", null);
        return result;
    }

    /**
     * 安全地将 Object 转为 Long.
     */
    private Long toLong(Object value) {
        if (value == null) {
            return null;
        }
        if (value instanceof Number) {
            return ((Number) value).longValue();
        }
        try {
            return Long.parseLong(value.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }
}
