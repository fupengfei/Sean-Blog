package com.sean.blog.module.blog.mapper;

import com.sean.blog.module.blog.entity.ArticleRelated;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ArticleRelatedMapper {

    /** 插入一条关联记录 */
    int insert(ArticleRelated record);

    /** 软删除一对关联（双向都删） */
    int softDeletePair(@Param("articleId") Long articleId,
                       @Param("relatedArticleId") Long relatedArticleId,
                       @Param("updatedBy") String updatedBy);

    /** 软删除某篇文章的所有关联 */
    int softDeleteAllByArticleId(@Param("articleId") Long articleId,
                                 @Param("updatedBy") String updatedBy);

    /** 查询某篇文章的所有关联文章 ID（未删除） */
    List<Long> findRelatedArticleIds(@Param("articleId") Long articleId);
}
