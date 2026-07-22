package com.sean.blog.module.blog.entity;
import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * 文章实体类，映射到 articles 表。
 *
 * <p>文章采用双存储策略：Markdown 原文（contentMd）存入数据库，同时作为文件保存到宿主机目录；
 * HTML 渲染结果（contentHtml）仅存数据库用于前台展示。文章通过 slug（URL 友好的唯一标识）支持
 * SEO 友好的访问路径。状态字段支持草稿、已发布、已删除三种状态，删除为软删除。</p>
 *
 * <p>注意：Long 类型 ID 字段使用 {@code @JsonFormat(shape = STRING)} 序列化，
 * 避免 JavaScript 大数精度丢失问题。</p>
 */
@Data
public class Article {

    /** 文章主键（Snowflake 算法生成） */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long id;

    /** 文章标题 */
    private String title;

    /** URL 友好的唯一标识，格式：{title-slug}-{timestamp} */
    private String slug;

    /** Markdown 原文内容 */
    private String contentMd;

    /** Markdown 渲染后的 HTML 内容，用于前台展示 */
    private String contentHtml;

    /** 文章摘要/摘录，可由用户手动填写或从正文自动提取 */
    private String excerpt;

    /** 作者 */
    private String author;

    /** 发布日期 */
    private LocalDate publishDate;

    /** 封面图片 URL */
    private String coverImage;

    /** 所属分类 ID */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long categoryId;

    /** 前置文章 ID，用于建立文章间的学习顺序关系 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long prerequisiteId;

    /** 下一篇文章 ID，用于文章间的导航流 */
    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private Long nextArticleId;

    /** 文章状态：DRAFT（草稿）、PUBLISHED（已发布）、DELETED（已删除） */
    private String status;

    /** 是否为精选/推荐文章 */
    private Boolean isFeatured;

    /** 浏览次数 */
    private Long viewCount;

    /** 创建时间 */
    private LocalDateTime createdAt;

    /** 更新时间 */
    private LocalDateTime updatedAt;

    /** 关联的分类对象（非数据库字段，用于联表查询结果映射） */
    private Category category;

    /** 关联的标签列表（非数据库字段，用于联表查询结果映射） */
    private List<Tag> tags;
}
