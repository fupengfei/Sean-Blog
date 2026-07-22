package com.sean.blog.module.file.entity;

import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文件合集实体（Skill Bundle），对应 file_bundles 表。
 * 一个 Bundle 对应一个 ZIP 压缩包解压后的目录，包含多个文件和子目录。
 *
 * @author sean
 */
@Data
public class FileBundle {

    /** 主键，雪花算法生成 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 合集名称 */
    private String name;

    /** 合集描述 */
    private String description;

    /** 文件系统根路径，如 /data/skills/{bundleId} */
    private String rootPath;

    /** 合集类型：如 SKILL / DOC 等 */
    private String type;

    /** 状态：PUBLISHED（已发布）/ DRAFT（草稿） */
    private String status;

    /** 是否为精选合集（首页展示用） */
    private Boolean isFeatured;

    /** 合集内文件数量 */
    private Integer fileCount;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 最后更新时间 */
    private LocalDateTime updatedAt;
}
