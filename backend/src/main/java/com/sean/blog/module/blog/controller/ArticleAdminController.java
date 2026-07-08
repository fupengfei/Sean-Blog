package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/articles")
public class ArticleAdminController {

    private final ArticleService articleService;

    public ArticleAdminController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping
    public Result<PageResult<Article>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listAll(page, size, keyword));
    }

    @PostMapping
    public Result<Article> create(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) List<Long> tagIds,
            @RequestParam(defaultValue = "false") boolean isFeatured) {
        return Result.success(articleService.createFromMd(file, categoryId, tagIds, isFeatured));
    }

    @PutMapping("/{id}")
    public Result<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        articleService.updateStatus(id, status);
        return Result.success();
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        articleService.updateStatus(id, "DELETED");
        return Result.success();
    }

    @PutMapping("/{id}/feature")
    public Result<?> toggleFeature(@PathVariable Long id) {
        articleService.toggleFeatured(id);
        return Result.success();
    }
}
