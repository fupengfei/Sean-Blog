package com.sean.blog.module.file.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
@AllArgsConstructor
public class FileTreeResponse {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long bundleId;
    private String bundleName;
    private List<FileTreeNode> tree;

    @Data
    @AllArgsConstructor
    public static class FileTreeNode {
        @JsonFormat(shape = JsonFormat.Shape.STRING)
        private Long id;
        private String name;
        private String nodeType;
        private String filePath;
        private Long fileSize;
        private List<FileTreeNode> children;
    }
}
