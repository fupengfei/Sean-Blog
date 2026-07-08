package com.sean.blog.module.blog.controller;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Tag;
import com.sean.blog.module.blog.service.TagService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
public class TagController {
    private final TagService tagService;
    public TagController(TagService tagService) { this.tagService = tagService; }

    @GetMapping("/api/v1/tags")
    public Result<List<Tag>> list() { return Result.success(tagService.findAll()); }
}

@RestController
@RequestMapping("/api/v1/admin")
class TagAdminController {
    private final TagService tagService;
    public TagAdminController(TagService tagService) { this.tagService = tagService; }

    @GetMapping("/tags")
    public Result<List<Tag>> list() { return Result.success(tagService.findAll()); }

    @PostMapping("/tags")
    public Result<Tag> create(@RequestBody Map<String, String> body) {
        return Result.success(tagService.create(body.get("name"), body.get("slug")));
    }

    @PutMapping("/tags/{id}")
    public Result<Tag> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.success(tagService.update(id, body.get("name"), body.get("slug")));
    }

    @DeleteMapping("/tags/{id}")
    public Result<?> delete(@PathVariable Long id) { tagService.delete(id); return Result.success(); }
}
