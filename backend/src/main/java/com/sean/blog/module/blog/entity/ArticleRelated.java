package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDateTime;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文章关联实体类，映射到 article_related 表。
 *
 * <p>用于记录文章之间的多对多关联关系。关联是双向的：当文章 A 关联文章 B 时，
 * 会同时写入 (A→B) 和 (B→A) 两条记录，确保从任意一端都能查到关联关系。
 * 删除采用软删除（{@code isDeleted} 标记），不物理删除记录。</p>
 */
@Data
public class ArticleRelated {

    /** 关联记录主键（Snowflake 算法生成） */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 文章 ID */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long articleId;

    /** 关联的文章 ID */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long relatedArticleId;

    /** 创建人 */
    private String createdBy;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新人 */
    private String updatedBy;

    /** 更新时间 */
    private LocalDateTime updatedAt;

    /** 软删除标记 */
    private Boolean isDeleted;
}
