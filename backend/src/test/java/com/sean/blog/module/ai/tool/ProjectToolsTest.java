package com.sean.blog.module.ai.tool;

import com.sean.blog.module.project.entity.Project;
import com.sean.blog.module.project.service.ProjectService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProjectToolsTest {

    @Mock
    private ProjectService projectService;

    @InjectMocks
    private ProjectTools tools;

    @Test
    void listsProjects() {
        Project p = new Project();
        p.setTitle("博客系统");
        p.setDescription("个人博客");
        p.setTags("Java,Spring Boot");
        p.setUrl("https://fpfos.com");
        when(projectService.findPublished()).thenReturn(List.of(p));

        String result = tools.listProjects();

        assertTrue(result.contains("博客系统"));
        assertTrue(result.contains("Java,Spring Boot"));
        assertTrue(result.contains("https://fpfos.com"));
    }

    @Test
    void emptyList() {
        when(projectService.findPublished()).thenReturn(List.of());
        assertTrue(tools.listProjects().contains("暂无"));
    }

    @Test
    void serviceFailureReturnsFriendlyMessage() {
        when(projectService.findPublished()).thenThrow(new RuntimeException("db down"));
        assertTrue(tools.listProjects().contains("查询项目列表失败"));
    }
}
