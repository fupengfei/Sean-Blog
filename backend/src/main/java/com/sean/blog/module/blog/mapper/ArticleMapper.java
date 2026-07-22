package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

/**
 * 文章 MyBatis Mapper 接口，提供文章相关的数据库操作。
 *
 * <p>包含文章的增删改查、状态管理、精选管理、标签关联管理、
 * 以及文章间关系（前置文章、下一篇）的设置与清除。</p>
 */
@Mapper
public interface ArticleMapper {

    /** 插入新文章 */
    int insert(Article article);

    /** 更新文章基本信息（标题、内容、分类、摘要等） */
    int update(Article article);

    /** 更新文章状态（DRAFT / PUBLISHED / DELETED） */
    int updateStatus(@Param("id") Long id, @Param("status") String status);

    /** 切换文章精选状态 */
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);

    /** 递增文章浏览次数 */
    int incrementViewCount(Long id);

    /** 根据 ID 查询文章（包含已删除） */
    Article findById(Long id);

    /** 根据 ID 查询已发布的文章 */
    Article findPublishedById(Long id);

    /** 根据 slug 查询文章 */
    Article findBySlug(String slug);

    /** 分页查询已发布的文章列表，支持分类、标签、关键词筛选 */
    List<Article> findPublished(Map<String, Object> params);

    /** 统计已发布文章总数，使用与 findPublished 相同的筛选条件 */
    long countPublished(Map<String, Object> params);

    /** 查询精选文章列表，按指定数量返回 */
    List<Article> findFeatured(int limit);

    /** 分页查询所有文章（包含草稿和已删除），支持关键词筛选 */
    List<Article> findAll(Map<String, Object> params);

    /** 统计所有文章总数，使用与 findAll 相同的筛选条件 */
    long countAll(Map<String, Object> params);

    /** 为文章添加标签关联（插入 article_tag 中间表记录） */
    int insertArticleTag(@Param("articleId") Long articleId, @Param("tagId") Long tagId);

    /** 删除文章的所有标签关联 */
    int deleteArticleTags(Long articleId);

    /** 设置文章的前置文章 */
    int setPrerequisite(@Param("id") Long id, @Param("prerequisiteId") Long prerequisiteId);

    /** 清除文章的前置文章 */
    int clearPrerequisite(@Param("id") Long id);

    /** 设置文章的下一篇 */
    int setNextArticle(@Param("id") Long id, @Param("nextArticleId") Long nextArticleId);

    /** 清除文章的下一篇 */
    int clearNextArticle(@Param("id") Long id);

    /** 根据 ID 列表批量查询文章摘要信息（仅返回 id 和 title），用于关联文章展示 */
    List<Article> findSummaryByIds(@Param("ids") List<Long> ids);
}
