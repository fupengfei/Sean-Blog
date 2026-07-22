package com.sean.blog.module.project.entity;

import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 项目实体，对应 projects 表。
 * id 使用雪花算法生成，序列化为 JSON 字符串以避免 JavaScript 大数精度丢失。
 *
 * @author sean
 */
@Data
public class Project {

    /** 项目主键，雪花算法生成（Long → JSON String 序列化） */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 项目标题 */
    private String title;

    /** 项目描述 */
    private String description;

    /** 项目线上地址 */
    private String url;

    /** 项目 GitHub 仓库地址 */
    private String githubUrl;

    /** 封面图访问路径（/api/v1/files/images/{filename}） */
    private String coverImage;

    /** 标签列表，JSON 字符串格式，如 ["Vue","Spring Boot"] */
    private String tags;

    /** 是否为首页精选项目 */
    private Boolean isFeatured;

    /** 排序权重，数值越大越靠前 */
    private Integer sortOrder;

    /** 状态：PUBLISHED（已发布）/ DRAFT（草稿）/ DELETED（已删除） */
    private String status;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 最后更新时间 */
    private LocalDateTime updatedAt;
}
