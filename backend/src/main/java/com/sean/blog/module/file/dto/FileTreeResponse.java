package com.sean.blog.module.file.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class FileTreeResponse {
    private Long bundleId;
    private String bundleName;
    private List<FileTreeNode> tree;

    @Data
    @AllArgsConstructor
    public static class FileTreeNode {
        private Long id;
        private String name;
        private String nodeType;
        private String filePath;
        private Long fileSize;
        private List<FileTreeNode> children;
    }
}
