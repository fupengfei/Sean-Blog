package com.sean.blog.module.project.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 项目管理后台接口控制器，所有接口路径均在 /api/v1/admin/projects 下，需要 JWT 认证。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1/admin/projects")
public class ProjectAdminController {

    private final ProjectService projectService;

    public ProjectAdminController(ProjectService projectService) {
        this.projectService = projectService;
    }

    /**
     * 查询所有项目（含草稿和已删除）。
     *
     * @return GET /api/v1/admin/projects
     */
    @GetMapping
    public Result<List<Project>> list() {
        return Result.success(projectService.findAll());
    }

    /**
     * 创建新项目，封面图为可选上传。
     *
     * @return POST /api/v1/admin/projects（multipart/form-data）
     */
    @PostMapping
    public Result<Project> create(
            @RequestParam(required = false) MultipartFile coverImage,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) String githubUrl,
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "false") boolean isFeatured) {
        return Result.success(projectService.create(title, description, url, githubUrl, tags, isFeatured, coverImage));
    }

    /**
     * 删除项目。
     *
     * @return DELETE /api/v1/admin/projects/{id}
     */
    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        projectService.delete(id);
        return Result.success();
    }

    /**
     * 更新项目。
     *
     * @return PUT /api/v1/admin/projects/{id}（multipart/form-data）
     */
    @PutMapping("/{id}")
    public Result<?> update(@PathVariable Long id,
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) String githubUrl,
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "false") boolean isFeatured,
            @RequestParam(required = false) MultipartFile coverImage) {
        projectService.update(id, title, description, url, githubUrl, tags, isFeatured, coverImage);
        return Result.success();
    }

    /**
     * 切换项目精选状态（取反）。
     *
     * @return PUT /api/v1/admin/projects/{id}/feature
     */
    @PutMapping("/{id}/feature")
    public Result<?> toggleFeature(@PathVariable Long id) {
        projectService.toggleFeatured(id);
        return Result.success();
    }

    /**
     * 更新项目排序权重。
     *
     * @param sortOrder 排序值，越大越靠前
     * @return PUT /api/v1/admin/projects/{id}/sort
     */
    @PutMapping("/{id}/sort")
    public Result<?> updateSort(@PathVariable Long id, @RequestParam int sortOrder) {
        projectService.updateSortOrder(id, sortOrder);
        return Result.success();
    }
}
