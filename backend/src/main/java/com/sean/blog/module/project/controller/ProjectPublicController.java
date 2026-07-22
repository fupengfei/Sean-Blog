package com.sean.blog.module.project.controller;

import com.sean.blog.common.Result;
import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 项目公开接口控制器，无需认证，供前台页面调用。
 *
 * @author sean
 */
@RestController
@RequestMapping("/api/v1")
public class ProjectPublicController {

    private final ProjectService projectService;

    public ProjectPublicController(ProjectService projectService) {
        this.projectService = projectService;
    }

    /**
     * 获取所有已发布项目列表。
     *
     * @return GET /api/v1/projects
     */
    @GetMapping("/projects")
    public Result<List<Project>> list() {
        return Result.success(projectService.findPublished());
    }

    /**
     * 获取精选项目列表（首页展示用）。
     *
     * @param limit 最大返回数量，默认 6
     * @return GET /api/v1/projects/featured
     */
    @GetMapping("/projects/featured")
    public Result<List<Project>> featured(@RequestParam(defaultValue = "6") int limit) {
        return Result.success(projectService.findFeatured(limit));
    }
}
