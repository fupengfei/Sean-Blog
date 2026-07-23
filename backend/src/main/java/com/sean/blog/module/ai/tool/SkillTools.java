package com.sean.blog.module.ai.tool;

import tools.jackson.databind.ObjectMapper;
import com.sean.blog.module.file.dto.FileTreeResponse;
import com.sean.blog.module.file.entity.FileBundle;
import com.sean.blog.module.file.service.FileBundleService;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

/**
 * Skill 文件库工具：列出 Bundle、查看文件树、读取文件内容。
 */
@Component
public class SkillTools {

    /** 工具返回的文件内容上限 */
    private static final int MAX_FILE_CONTENT_LENGTH = 10000;

    private final FileBundleService fileBundleService;
    private final ObjectMapper objectMapper;

    public SkillTools(FileBundleService fileBundleService, ObjectMapper objectMapper) {
        this.fileBundleService = fileBundleService;
        this.objectMapper = objectMapper;
    }

    @Tool(name = "listSkillBundles",
            description = "列出已发布的 Skill 文件包（id、名称、描述、类型）。用户问「有哪些 Skill」「技能包」时使用。")
    public String listSkillBundles() {
        List<FileBundle> bundles = fileBundleService.listPublished();
        if (bundles.isEmpty()) {
            return "暂无已发布的 Skill 文件包。";
        }
        return bundles.stream()
                .map(b -> String.format("- 《%s》(id: %d, 类型: %s)\n  %s",
                        b.getName(), b.getId(),
                        b.getType() == null ? "" : b.getType(),
                        b.getDescription() == null ? "" : b.getDescription()))
                .collect(Collectors.joining("\n"));
    }

    @Tool(name = "getSkillFileTree",
            description = "获取指定 Skill 文件包的文件树结构（JSON）。先用 listSkillBundles 取得 bundleId。")
    public String getSkillFileTree(@ToolParam(description = "Skill 文件包 ID") Long bundleId) {
        try {
            FileTreeResponse tree = fileBundleService.getTree(bundleId);
            return objectMapper.writeValueAsString(tree);
        } catch (RuntimeException e) {
            return "获取文件树失败：" + e.getMessage();
        }
    }

    @Tool(name = "readSkillFile",
            description = "读取 Skill 文件包内指定路径的文件内容（超过 10000 字符截断）。路径来自 getSkillFileTree。")
    public String readSkillFile(@ToolParam(description = "Skill 文件包 ID") Long bundleId,
                                @ToolParam(description = "文件路径，如 docs/guide.md") String filePath) {
        try {
            String content = fileBundleService.getFileContent(bundleId, filePath);
            if (content.length() > MAX_FILE_CONTENT_LENGTH) {
                content = content.substring(0, MAX_FILE_CONTENT_LENGTH) + "\n…（内容过长已截断）";
            }
            return content;
        } catch (Exception e) {
            return "读取失败：" + e.getMessage();
        }
    }
}
