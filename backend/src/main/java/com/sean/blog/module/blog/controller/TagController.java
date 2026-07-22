package com.sean.blog.module.blog.controller;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Tag;
import com.sean.blog.module.blog.service.TagService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * 标签公开接口控制器，提供无需认证的标签列表查询。
 */
@RestController
public class TagController {
    private final TagService tagService;
    public TagController(TagService tagService) { this.tagService = tagService; }

    /** 获取所有标签列表 */
    @GetMapping("/api/v1/tags")
    public Result<List<Tag>> list() { return Result.success(tagService.findAll()); }
}

/**
 * 标签管理后台控制器，提供需 JWT 认证的标签增删改查 API。
 */
@RestController
@RequestMapping("/api/v1/admin")
class TagAdminController {
    private final TagService tagService;
    public TagAdminController(TagService tagService) { this.tagService = tagService; }

    /** 获取所有标签列表 */
    @GetMapping("/tags")
    public Result<List<Tag>> list() { return Result.success(tagService.findAll()); }

    /** 创建新标签 */
    @PostMapping("/tags")
    public Result<Tag> create(@RequestBody Map<String, String> body) {
        return Result.success(tagService.create(body.get("name"), body.get("slug")));
    }

    /** 更新标签信息 */
    @PutMapping("/tags/{id}")
    public Result<Tag> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.success(tagService.update(id, body.get("name"), body.get("slug")));
    }

    /** 删除标签 */
    @DeleteMapping("/tags/{id}")
    public Result<?> delete(@PathVariable Long id) { tagService.delete(id); return Result.success(); }
}
