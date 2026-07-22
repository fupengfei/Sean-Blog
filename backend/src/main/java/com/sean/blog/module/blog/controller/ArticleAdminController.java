package com.sean.blog.module.blog.controller;

import com.sean.blog.common.PageResult;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

/**
 * 文章管理后台控制器，提供需 JWT 认证的文章管理 API。
 *
 * <p>接口路径以 {@code /api/v1/admin/articles} 为前缀。
 * 提供文章的完整 CRUD 操作，包括：</p>
 * <ul>
 *   <li>创建（从 Markdown 文件上传）</li>
 *   <li>更新（含可选的新 MD 文件上传）</li>
 *   <li>状态管理（发布/取消发布/删除）</li>
 *   <li>精选状态切换</li>
 *   <li>文章关系管理（前置文章、下一篇、关联文章）</li>
 * </ul>
 */
@RestController
@RequestMapping("/api/v1/admin/articles")
public class ArticleAdminController {

    private final ArticleService articleService;

    public ArticleAdminController(ArticleService articleService) {
        this.articleService = articleService;
    }

    /** 根据 ID 获取文章详情（含草稿和已删除） */
    @GetMapping("/{id}")
    public Result<Article> getById(@PathVariable Long id) {
        return Result.success(articleService.getById(id));
    }

    /** 分页查询所有文章列表（含草稿和已删除） */
    @GetMapping
    public Result<PageResult<Article>> list(
            @RequestParam(defaultValue = "1") Integer page,
            @RequestParam(defaultValue = "10") Integer size,
            @RequestParam(required = false) String keyword) {
        return Result.success(articleService.listAll(page, size, keyword));
    }

    /**
     * 从 Markdown 文件创建新文章。
     *
     * <p>标签以逗号分隔的字符串形式传递，例如 "1,2,3"。</p>
     */
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

    /** 更新文章信息，可选择性上传新 MD 文件替换原文 */
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

    /**
     * 解析发布日期字符串为 LocalDate。
     *
     * @param dateStr ISO 格式日期字符串（yyyy-MM-dd），为空时返回 null
     * @return LocalDate 或 null
     */
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

    /**
     * 解析逗号分隔的标签 ID 字符串为 Long 列表。
     *
     * @param tagsStr 逗号分隔的标签 ID 字符串，例如 "1,2,3"
     * @return 标签 ID 列表，为空时返回空列表
     */
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

    /** 更新文章状态 */
    @PutMapping("/{id}/status")
    public Result<?> updateStatus(@PathVariable Long id, @RequestParam String status) {
        articleService.updateStatus(id, status);
        return Result.success();
    }

    /** 删除文章（软删除为 DELETED 状态） */
    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        articleService.updateStatus(id, "DELETED");
        return Result.success();
    }

    /** 切换文章精选状态 */
    @PutMapping("/{id}/feature")
    public Result<?> toggleFeature(@PathVariable Long id) {
        articleService.toggleFeatured(id);
        return Result.success();
    }

    /** 获取文章的所有关系信息 */
    @GetMapping("/{id}/related")
    public Result<Map<String, Object>> getRelations(@PathVariable Long id) {
        return Result.success(articleService.getRelations(id));
    }

    /** 设置文章的前置文章 */
    @PutMapping("/{id}/prerequisite")
    public Result<?> setPrerequisite(@PathVariable Long id,
                                      @RequestBody Map<String, Long> body) {
        Long prerequisiteId = body.get("prerequisiteId");
        articleService.setPrerequisite(id, prerequisiteId);
        return Result.success();
    }

    /** 清除文章的前置文章 */
    @DeleteMapping("/{id}/prerequisite")
    public Result<?> removePrerequisite(@PathVariable Long id) {
        articleService.removePrerequisite(id);
        return Result.success();
    }

    /** 设置文章的关联文章列表（全量替换） */
    @PutMapping("/{id}/related")
    public Result<?> setRelated(@PathVariable Long id,
                                 @RequestBody Map<String, List<Long>> body) {
        List<Long> relatedIds = body.get("relatedIds");
        articleService.setRelated(id, relatedIds);
        return Result.success();
    }

    /** 设置文章的下一篇文章 */
    @PutMapping("/{id}/next-article")
    public Result<?> setNextArticle(@PathVariable Long id,
                                     @RequestBody Map<String, Long> body) {
        Long nextArticleId = body.get("nextArticleId");
        articleService.setNextArticle(id, nextArticleId);
        return Result.success();
    }

    /** 清除文章的下一篇文章 */
    @DeleteMapping("/{id}/next-article")
    public Result<?> removeNextArticle(@PathVariable Long id) {
        articleService.removeNextArticle(id);
        return Result.success();
    }
}
