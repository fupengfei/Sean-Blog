package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin/articles")
public class ArticleAdminController {

    private final ArticleService articleService;

    public ArticleAdminController(ArticleService articleService) {
        this.articleService = articleService;
    }

    @GetMapping("/{id}")
    public Result<Article> getById(@PathVariable Long id) {
        return Result.success(articleService.getById(id));
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
            @RequestParam(value = "tags", required = false) String tagsStr,
            @RequestParam(defaultValue = "false") boolean isFeatured,
            @RequestParam(required = false, defaultValue = "") String author,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String publishDate) {
        List<Long> tagIds = parseTagIds(tagsStr);
        java.time.LocalDate pd = parsePublishDate(publishDate);
        return Result.success(articleService.createFromMd(file, categoryId, tagIds, isFeatured, author, title, description, pd));
    }

    @PutMapping(value = "/{id}")
    public Result<Article> update(
            @PathVariable Long id,
            @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(value = "tags", required = false) String tagsStr,
            @RequestParam(defaultValue = "false") boolean isFeatured,
            @RequestParam(required = false) String author,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String publishDate) {
        List<Long> tagIds = parseTagIds(tagsStr);
        java.time.LocalDate pd = parsePublishDate(publishDate);
        return Result.success(articleService.updateArticle(id, file, categoryId, tagIds, isFeatured, author, title, description, pd));
    }

    private java.time.LocalDate parsePublishDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return null;
        }
        try {
            return java.time.LocalDate.parse(dateStr);
        } catch (Exception e) {
            return null;
        }
    }

    private List<Long> parseTagIds(String tagsStr) {
        if (tagsStr == null || tagsStr.trim().isEmpty()) {
            return List.of();
        }
        try {
            return java.util.Arrays.stream(tagsStr.split(","))
                    .map(String::trim)
                    .filter(s -> !s.isEmpty())
                    .map(Long::parseLong)
                    .toList();
        } catch (NumberFormatException e) {
            return List.of();
        }
    }

    @PutMapping("/{id}/status")
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

    @GetMapping("/{id}/related")
    public Result<Map<String, Object>> getRelations(@PathVariable Long id) {
        return Result.success(articleService.getRelations(id));
    }

    @PutMapping("/{id}/prerequisite")
    public Result<?> setPrerequisite(@PathVariable Long id,
                                      @RequestBody Map<String, Long> body) {
        Long prerequisiteId = body.get("prerequisiteId");
        articleService.setPrerequisite(id, prerequisiteId);
        return Result.success();
    }

    @DeleteMapping("/{id}/prerequisite")
    public Result<?> removePrerequisite(@PathVariable Long id) {
        articleService.removePrerequisite(id);
        return Result.success();
    }

    @PutMapping("/{id}/related")
    public Result<?> setRelated(@PathVariable Long id,
                                 @RequestBody Map<String, List<Long>> body) {
        List<Long> relatedIds = body.get("relatedIds");
        articleService.setRelated(id, relatedIds);
        return Result.success();
    }

    @PutMapping("/{id}/next-article")
    public Result<?> setNextArticle(@PathVariable Long id,
                                     @RequestBody Map<String, Long> body) {
        Long nextArticleId = body.get("nextArticleId");
        articleService.setNextArticle(id, nextArticleId);
        return Result.success();
    }

    @DeleteMapping("/{id}/next-article")
    public Result<?> removeNextArticle(@PathVariable Long id) {
        articleService.removeNextArticle(id);
        return Result.success();
    }
}
