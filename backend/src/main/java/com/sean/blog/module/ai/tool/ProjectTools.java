package com.sean.blog.module.ai.tool;

import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * 项目类工具：列出 Sean 的已发布项目。
 */
@Component
public class ProjectTools {

    private final ProjectService projectService;

    public ProjectTools(ProjectService projectService) {
        this.projectService = projectService;
    }

    @Tool(name = "listProjects",
            description = "列出 Sean 的个人项目，返回名称、描述、技术栈和链接。用户问「有哪些项目」「做过什么」时使用。")
    public String listProjects() {
        List<Project> projects = projectService.findPublished();
        if (projects.isEmpty()) {
            return "暂无已发布项目。";
        }
        return projects.stream()
                .map(p -> String.format("- 《%s》\n  描述：%s\n  技术栈：%s\n  链接：%s%s",
                        p.getTitle(),
                        p.getDescription() == null ? "" : p.getDescription(),
                        p.getTags() == null ? "" : p.getTags(),
                        p.getUrl() == null ? "" : p.getUrl(),
                        p.getGithubUrl() == null ? "" : "\n  GitHub：" + p.getGithubUrl()))
                .collect(Collectors.joining("\n"));
    }
}
