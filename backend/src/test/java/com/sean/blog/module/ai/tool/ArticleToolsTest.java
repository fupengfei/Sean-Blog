package com.sean.blog.module.ai.tool;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ArticleToolsTest {

    @Mock
    private ArticleMapper articleMapper;

    @InjectMocks
    private ArticleTools tools;

    private Article article(String slug, String status, String content) {
        Article a = new Article();
        a.setSlug(slug);
        a.setStatus(status);
        a.setTitle("标题");
        a.setContentMd(content);
        a.setExcerpt("摘要");
        a.setPublishDate(LocalDate.of(2026, 7, 1));
        return a;
    }

    @Test
    void getArticleBySlugReturnsContent() {
        when(articleMapper.findBySlug("java-1")).thenReturn(article("java-1", "PUBLISHED", "正文"));
        String result = tools.getArticleBySlug("java-1");
        assertTrue(result.contains("《标题》"));
        assertTrue(result.contains("正文"));
    }

    @Test
    void getArticleBySlugRejectsUnpublished() {
        when(articleMapper.findBySlug("draft-1")).thenReturn(article("draft-1", "DRAFT", "正文"));
        assertTrue(tools.getArticleBySlug("draft-1").contains("未找到"));
    }

    @Test
    void getArticleBySlugTruncatesLongContent() {
        String longContent = "x".repeat(9000);
        when(articleMapper.findBySlug("long-1")).thenReturn(article("long-1", "PUBLISHED", longContent));
        String result = tools.getArticleBySlug("long-1");
        assertTrue(result.contains("已截断"));
        assertFalse(result.contains("x".repeat(8001)));
    }

    @Test
    void listRecentArticlesFormats() {
        when(articleMapper.findPublished(anyMap())).thenReturn(List.of(article("java-1", "PUBLISHED", "正文")));
        String result = tools.listRecentArticles(null);
        assertTrue(result.contains("《标题》"));
        assertTrue(result.contains("java-1"));
        assertTrue(result.contains("摘要"));
    }

    @Test
    void listRecentArticlesClampsCount() {
        when(articleMapper.findPublished(anyMap())).thenReturn(List.of());
        String result = tools.listRecentArticles(99);
        assertTrue(result.contains("暂无"));
    }

    @Test
    void dbFailureReturnsFriendlyMessage() {
        when(articleMapper.findBySlug("any")).thenThrow(new RuntimeException("db down"));
        assertEquals("查询文章失败，请稍后重试。", tools.getArticleBySlug("any"));
    }
}
