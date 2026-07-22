package com.sean.blog.module.blog.service;

import com.sean.blog.common.SnowflakeIdGenerator;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import com.sean.blog.module.blog.mapper.ArticleRelatedMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleServiceFindPublishedByIdTest {

    @Mock
    private ArticleMapper articleMapper;
    @Mock
    private ArticleRelatedMapper articleRelatedMapper;
    @Mock
    private SnowflakeIdGenerator idGenerator;

    private ArticleService service;

    @BeforeEach
    void setUp() {
        service = new ArticleService(articleMapper, articleRelatedMapper, idGenerator, "/tmp/articles");
    }

    @Test
    void returnsPublishedArticleWithoutIncrementingViews() {
        Article article = new Article();
        article.setId(1L);
        when(articleMapper.findPublishedById(1L)).thenReturn(article);

        Article result = service.findPublishedById(1L);

        assertSame(article, result);
        verify(articleMapper, never()).incrementViewCount(any());
    }

    @Test
    void returnsNullWhenNotFoundOrNotPublished() {
        when(articleMapper.findPublishedById(99L)).thenReturn(null);
        assertNull(service.findPublishedById(99L));
    }
}
