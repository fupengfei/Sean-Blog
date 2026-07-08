package com.sean.blog.module.blog.controller;
import com.sean.blog.common.Result;
import com.sean.blog.module.blog.entity.Category;
import com.sean.blog.module.blog.service.CategoryService;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
public class CategoryController {
    private final CategoryService categoryService;
    public CategoryController(CategoryService categoryService) { this.categoryService = categoryService; }

    @GetMapping("/api/v1/categories")
    public Result<List<Category>> list() { return Result.success(categoryService.findAll()); }
}

@RestController
@RequestMapping("/api/v1/admin")
class CategoryAdminController {
    private final CategoryService categoryService;
    public CategoryAdminController(CategoryService categoryService) { this.categoryService = categoryService; }

    @GetMapping("/categories")
    public Result<List<Category>> list() { return Result.success(categoryService.findAll()); }

    @PostMapping("/categories")
    public Result<Category> create(@RequestBody Map<String, String> body) {
        return Result.success(categoryService.create(body.get("name"), body.get("slug")));
    }

    @PutMapping("/categories/{id}")
    public Result<Category> update(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return Result.success(categoryService.update(id, body.get("name"), body.get("slug")));
    }

    @DeleteMapping("/categories/{id}")
    public Result<?> delete(@PathVariable Long id) { categoryService.delete(id); return Result.success(); }
}
