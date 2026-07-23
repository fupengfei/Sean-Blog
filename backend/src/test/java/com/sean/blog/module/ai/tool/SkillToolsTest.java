package com.sean.blog.module.ai.tool;

import tools.jackson.databind.ObjectMapper;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.service.FileBundleService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.IOException;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SkillToolsTest {

    @Mock
    private FileBundleService fileBundleService;

    private SkillTools tools;

    @BeforeEach
    void setUp() {
        tools = new SkillTools(fileBundleService, new ObjectMapper());
    }

    @Test
    void listsBundles() {
        FileBundle b = new FileBundle();
        b.setId(1L);
        b.setName("Spring AI 入门");
        b.setDescription("技能包");
        b.setType("SKILL");
        when(fileBundleService.listPublished()).thenReturn(List.of(b));

        String result = tools.listSkillBundles();

        assertTrue(result.contains("Spring AI 入门"));
        assertTrue(result.contains("id: 1"));
    }

    @Test
    void fileTreeSerializes() {
        FileTreeResponse tree = new FileTreeResponse(1L, "包", List.of());
        when(fileBundleService.getTree(1L)).thenReturn(tree);

        String result = tools.getSkillFileTree(1L);

        assertTrue(result.contains("包"));
    }

    @Test
    void readsFileWithTruncation() throws IOException {
        when(fileBundleService.getFileContent(1L, "a.md")).thenReturn("y".repeat(12000));

        String result = tools.readSkillFile(1L, "a.md");

        assertTrue(result.contains("已截断"));
    }

    @Test
    void readFailureReturnsMessage() throws IOException {
        when(fileBundleService.getFileContent(1L, "bad.md")).thenThrow(new IOException("not found"));

        String result = tools.readSkillFile(1L, "bad.md");

        assertTrue(result.contains("读取失败"));
    }
}
