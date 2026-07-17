package com.sean.blog.module.blog.mapper;
import com.sean.blog.module.blog.entity.Article;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;
import java.util.Map;

@Mapper
public interface ArticleMapper {
    int insert(Article article);
    int update(Article article);
    int updateStatus(@Param("id") Long id, @Param("status") String status);
    int updateFeatured(@Param("id") Long id, @Param("featured") boolean featured);
    int incrementViewCount(Long id);
    Article findById(Long id);
    Article findBySlug(String slug);
    List<Article> findPublished(Map<String, Object> params);
    long countPublished(Map<String, Object> params);
    List<Article> findFeatured(int limit);
    List<Article> findAll(Map<String, Object> params);
    long countAll(Map<String, Object> params);
    int insertArticleTag(@Param("articleId") Long articleId, @Param("tagId") Long tagId);
    int deleteArticleTags(Long articleId);

    int setPrerequisite(@Param("id") Long id, @Param("prerequisiteId") Long prerequisiteId);
    int clearPrerequisite(@Param("id") Long id);
    Article findSummaryBySlug(@Param("slug") String slug);
    List<Article> findSummaryByIds(@Param("ids") List<Long> ids);
}
