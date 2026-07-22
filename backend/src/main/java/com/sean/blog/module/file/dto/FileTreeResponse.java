package com.sean.blog.module.file.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文件树响应 DTO，用于返回合集的完整目录结构。
 * 包含合集基本信息和递归的文件树节点列表。
 *
 * @author sean
 */
@Data
@AllArgsConstructor
public class FileTreeResponse {

    /** 合集 ID */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long bundleId;

    /** 合集名称 */
    private String bundleName;

    /** 文件树根节点列表 */
    private List<FileTreeNode> tree;

    /**
     * 文件树节点，递归结构。
     * 每个节点代表一个文件或目录，children 为子节点列表。
     */
    @Data
    @AllArgsConstructor
    public static class FileTreeNode {

        /** 节点 ID */
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private Long id;

        /** 文件/目录名称 */
        private String name;

        /** 节点类型：DIRECTORY / FILE */
        private String nodeType;

        /** 文件相对路径（FILE 类型有效） */
        private String filePath;

        /** 文件大小（字节） */
        private Long fileSize;

        /** 子节点列表，空时可为 null */
        private List<FileTreeNode> children;
    }
}
