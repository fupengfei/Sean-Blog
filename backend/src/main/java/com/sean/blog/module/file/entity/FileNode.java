package com.sean.blog.module.file.entity;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

@Data
public class FileNode {
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long bundleId;
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long parentId;
    private String name;
    private String nodeType;    // DIRECTORY / FILE
    private String filePath;
    private Long fileSize;
    private Integer sortOrder;
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FileNode> children;  // not stored in DB, for tree structure
}
