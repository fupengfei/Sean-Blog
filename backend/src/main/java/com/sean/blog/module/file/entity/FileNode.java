package com.sean.blog.module.file.entity;

import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.ToString;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文件节点实体，对应 file_nodes 表，表示合集中的一个文件或目录。
 * 通过 parentId 形成树形结构；children 字段仅用于内存树构建，不持久化。
 *
 * @author sean
 */
@Data
public class FileNode {

    /** 主键，雪花算法生成 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 所属合集 ID */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long bundleId;

    /** 父节点 ID，null 表示合集根节点 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long parentId;

    /** 文件/目录名称 */
    private String name;

    /** 节点类型：DIRECTORY（目录）/ FILE（文件） */
    private String nodeType;

    /** 文件相对路径（仅 FILE 类型有效，相对于合集根目录） */
    private String filePath;

    /** 文件大小（字节），目录为 0 */
    private Long fileSize;

    /** 同层级排序权重 */
    private Integer sortOrder;

    /** 子节点列表，仅内存中使用，不存储到数据库 */
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<FileNode> children;
}
