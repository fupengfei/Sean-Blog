package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文章标签实体类，映射到 tags 表。
 *
 * <p>文章与标签为多对多关系，通过 article_tag 中间表关联。
 * 标签通过 slug 支持 URL 友好的筛选路径。</p>
 */
@Data
public class Tag {

    /** 标签主键（Snowflake 算法生成） */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 标签名称 */
    private String name;

    /** URL 友好的唯一标识 */
    private String slug;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
