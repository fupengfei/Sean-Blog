package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 文章公开接口控制器，提供无需认证的前台文章访问 API。
 *
 * <p>接口路径以 {@code /api/v1} 为前缀，所有接口无需 JWT 认证。
 * 支持分页列表（含分类/标签/关键词筛选）、精选文章、文章详情、前置文章、
 * 关联文章和下一篇文章等查询功能。</p>
 */
@RestController
@RequestMapping("/api/v1")
public class ArticlePublicController {

    private final ArticleService articleService;

    public ArticlePublicController(ArticleService articleService) {
        this.articleService = articleService;
    }

    /**
     * 分页查询已发布文章列表。
     *
     * @param category 分类 ID 筛选（可选）
     * @param tag      标签 ID 筛选（可选）
     * @param page     页码，默认 1
     * @param size     每页大小，默认 10
     * @param keyword  关键词搜索（可选，匹配标题和内容）
     */
    @GetMapping("/articles")
    public Result<PageResult<Article>> list(
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) Long tag,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listPublished(page, size, category, tag, keyword));
    }

    /** 获取精选文章列表 */
    @GetMapping("/articles/featured")
    public Result<List<Article>> featured(@RequestParam(defaultValue = "6") int limit) {
        return Result.success(articleService.getFeatured(limit));
    }

    /** 根据 ID 获取已发布文章详情 */
    @GetMapping("/articles/{id}")
    public Result<Article> getById(@PathVariable Long id) {
        return Result.success(articleService.getPublishedById(id));
    }

    /** 获取文章的前置文章 */
    @GetMapping("/articles/{id}/prerequisite")
    public Result<Article> getPrerequisite(@PathVariable Long id) {
        Article article = articleService.getPublishedById(id);
        if (article.getPrerequisiteId() == null) {
            return Result.success(null);
        }
        Article prerequisite = articleService.getPrerequisiteByArticleId(article.getPrerequisiteId());
        return Result.success(prerequisite);
    }

    /** 获取文章的关联文章列表 */
    @GetMapping("/articles/{id}/related")
    public Result<List<Article>> getRelated(@PathVariable Long id) {
        return Result.success(articleService.getRelatedById(id));
    }

    /** 获取文章的下一篇文章（导航流） */
    @GetMapping("/articles/{id}/next")
    public Result<Article> getNext(@PathVariable Long id) {
        Article next = articleService.getNextArticle(id);
        return Result.success(next);
    }
}
