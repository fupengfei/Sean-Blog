package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ArticlePublicController {

    private final ArticleService articleService;

    public ArticlePublicController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/articles")
    public Result<PageResult<Article>> list(
            @RequestParam(required = false) Long category,
            @RequestParam(required = false) Long tag,
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listPublished(page, size, category, tag, keyword));
    }

    @GetMapping("/articles/featured")
    public Result<List<Article>> featured(@RequestParam(defaultValue = "6") int limit) {
        return Result.success(articleService.getFeatured(limit));
    }

    @GetMapping("/articles/{slug}")
    public Result<Article> getBySlug(@PathVariable String slug) {
        return Result.success(articleService.getBySlug(slug));
    }

    @GetMapping("/articles/{slug}/prerequisite")
    public Result<Article> getPrerequisite(@PathVariable String slug) {
        Article prerequisite = articleService.getPrerequisite(slug);
        return Result.success(prerequisite);
    }

    @GetMapping("/articles/{slug}/related")
    public Result<List<Article>> getRelated(@PathVariable String slug) {
        return Result.success(articleService.getRelated(slug));
    }
}
