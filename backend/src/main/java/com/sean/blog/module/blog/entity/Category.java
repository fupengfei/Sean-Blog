package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文章分类实体类，映射到 categories 表。
 *
 * <p>每篇文章属于一个分类，分类通过 slug 支持 URL 友好的筛选路径。</p>
 */
@Data
public class Category {

    /** 分类主键（Snowflake 算法生成） */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 分类名称 */
    private String name;

    /** URL 友好的唯一标识 */
    private String slug;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;
}
