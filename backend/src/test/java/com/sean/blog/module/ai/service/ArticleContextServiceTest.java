package com.sean.blog.module.ai.service;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleContextServiceTest {

    @Mock
    private ArticleService articleService;

    @InjectMocks
    private ArticleContextService service;

    private Article article(String title, String contentMd, String excerpt) {
        Article a = new Article();
        a.setTitle(title);
        a.setContentMd(contentMd);
        a.setExcerpt(excerpt);
        return a;
    }

    @Test
    void nullOrInvalidIdReturnsEmptyWithoutQuery() {
        assertEquals(Optional.empty(), service.buildArticleContext(null));
        assertEquals(Optional.empty(), service.buildArticleContext(0L));
        assertEquals(Optional.empty(), service.buildArticleContext(-1L));
        verifyNoInteractions(articleService);
    }

    @Test
    void notFoundReturnsEmpty() {
        when(articleService.findPublishedById(1L)).thenReturn(null);
        assertEquals(Optional.empty(), service.buildArticleContext(1L));
    }

    @Test
    void buildsBlockFromContentMd() {
        when(articleService.findPublishedById(1L))
                .thenReturn(article("测试文章", "# 标题\n正文内容", "摘要"));

        Optional<String> block = service.buildArticleContext(1L);

        assertTrue(block.isPresent());
        assertTrue(block.get().startsWith("---当前文章---"));
        assertTrue(block.get().contains("《测试文章》"));
        assertTrue(block.get().contains("# 标题\n正文内容"));
        assertTrue(block.get().endsWith("---当前文章结束---"));
    }

    @Test
    void fallsBackToExcerptWhenContentMdBlank() {
        when(articleService.findPublishedById(2L))
                .thenReturn(article("摘要文章", "   ", "这是摘要"));

        Optional<String> block = service.buildArticleContext(2L);

        assertTrue(block.isPresent());
        assertTrue(block.get().contains("这是摘要"));
    }

    @Test
    void emptyContentAndExcerptReturnsEmpty() {
        when(articleService.findPublishedById(3L)).thenReturn(article("空文章", "", ""));
        assertEquals(Optional.empty(), service.buildArticleContext(3L));
    }

    @Test
    void truncatesOverlongContent() {
        String longContent = "字".repeat(ArticleContextService.MAX_CONTENT_LENGTH + 100);
        when(articleService.findPublishedById(4L))
                .thenReturn(article("长文章", longContent, "摘要"));

        Optional<String> block = service.buildArticleContext(4L);

        assertTrue(block.isPresent());
        assertTrue(block.get().contains("…（内容过长已截断）"));
        assertFalse(block.get().contains("字".repeat(ArticleContextService.MAX_CONTENT_LENGTH + 1)));
    }

    @Test
    void swallowsExceptionsAndReturnsEmpty() {
        when(articleService.findPublishedById(5L)).thenThrow(new RuntimeException("db down"));
        assertEquals(Optional.empty(), service.buildArticleContext(5L));
    }
}
