package com.sean.blog.module.blog.controller;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.service.CategoryService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

/**
 * 分类公开接口控制器，提供无需认证的分类列表查询。
 */
@RestController
public class CategoryController {
    private final CategoryService categoryService;
    public CategoryController(CategoryService categoryService) { this.categoryService = categoryService; }

    /** 获取所有分类列表 */
    @GetMapping("/api/v1/categories")
    public Result<List<Category>> list() { return Result.success(categoryService.findAll()); }
}

/**
 * 分类管理后台控制器，提供需 JWT 认证的分类增删改查 API。
 */
@RestController
@RequestMapping("/api/v1/admin")
class CategoryAdminController {
    private final CategoryService categoryService;
    public CategoryAdminController(CategoryService categoryService) { this.categoryService = categoryService; }

    /** 获取所有分类列表 */
    @GetMapping("/categories")
    public Result<List<Category>> list() { return Result.success(categoryService.findAll()); }

    /** 创建新分类 */
    @PostMapping("/categories")
    public Result<Category> create(@RequestBody Map<String, String> body) {
        return Result.success(categoryService.create(body.get("name"), body.get("slug")));
    }

    /** 更新分类信息 */
    @PutMapping("/categories/{id}")
    public Result<Category> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.success(categoryService.update(id, body.get("name"), body.get("slug")));
    }

    /** 删除分类 */
    @DeleteMapping("/categories/{id}")
    public Result<?> delete(@PathVariable Long id) { categoryService.delete(id); return Result.success(); }
}
