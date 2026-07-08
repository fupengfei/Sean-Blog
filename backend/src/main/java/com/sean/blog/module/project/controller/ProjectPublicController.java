package com.sean.blog.module.project.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
public class ProjectPublicController {

    private final ProjectService projectService;

    public ProjectPublicController(ProjectService projectService) {
        this.projectService = projectService;
    }

    @GetMapping("/projects")
    public Result<List<Project>> list() {
        return Result.success(projectService.findPublished());
    }

    @GetMapping("/projects/featured")
    public Result<List<Project>> featured(@RequestParam(defaultValue = "6") int limit) {
        return Result.success(projectService.findFeatured(limit));
    }
}
