package com.sean.blog.module.file.entity;

import lombok.Data;
import java.util.List;

@Data
public class FileNode {
    private Long id;
    private Long bundleId;
    private Long parentId;
    private String name;
    private String nodeType;    // DIRECTORY / FILE
    private String filePath;
    private Long fileSize;
    private Integer sortOrder;
    private List<FileNode> children;  // 不存DB，用于树结构
}
