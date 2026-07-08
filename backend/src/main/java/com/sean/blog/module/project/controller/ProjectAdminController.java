package com.sean.blog.module.project.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/projects")
public class ProjectAdminController {

    private final ProjectService projectService;

    public ProjectAdminController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping
    public Result<List<Project>> list() {
        return Result.success(projectService.findAll());
    }

    @PostMapping
    public Result<Project> create(
            @RequestParam MultipartFile coverImage,
            @RequestParam String title,
            @RequestParam(required = false) String description,
            @RequestParam(required = false) String url,
            @RequestParam(required = false) String githubUrl,
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "false") boolean isFeatured) {
        return Result.success(projectService.create(title, description, url, githubUrl, tags, isFeatured, coverImage));
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@PathVariable Long id) {
        projectService.delete(id);
        return Result.success();
    }

    @PutMapping("/{id}/feature")
    public Result<?> toggleFeature(@PathVariable Long id) {
        projectService.toggleFeatured(id);
        return Result.success();
    }

    @PutMapping("/{id}/sort")
    public Result<?> updateSort(@PathVariable Long id, @RequestParam int sortOrder) {
        projectService.updateSortOrder(id, sortOrder);
        return Result.success();
    }
}
