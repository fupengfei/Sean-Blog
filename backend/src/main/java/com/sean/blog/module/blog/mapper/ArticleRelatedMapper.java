package com.sean.blog.module.blog.mapper;

import com.sean.blog.module.blog.entity.ArticleRelated;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 文章关联 MyBatis Mapper 接口，提供文章关联关系的数据库操作。
 *
 * <p>关联关系是双向的，增删操作需同时处理正反两条记录。
 * 删除采用软删除方式，通过 {@code is_deleted} 字段标记。</p>
 */
@Mapper
public interface ArticleRelatedMapper {

    /** 插入一条关联记录 */
    int insert(ArticleRelated record);

    /** 软删除一对关联（双向都删），将 articleId→relatedArticleId 和 relatedArticleId→articleId 两条记录标记为已删除 */
    int softDeletePair(@Param("articleId") Long articleId,
                       @Param("relatedArticleId") Long relatedArticleId,
                       @Param("updatedBy") String updatedBy);

    /** 查询某篇文章的所有关联文章 ID（未删除） */
    List<Long> findRelatedArticleIds(@Param("articleId") Long articleId);
}
