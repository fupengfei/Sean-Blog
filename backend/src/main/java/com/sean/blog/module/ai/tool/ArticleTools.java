package com.sean.blog.module.ai.tool;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 文章类工具：按 slug 取全文、列出最近文章。
 */
@Component
public class ArticleTools {

    /** 工具返回的文章正文上限 */
    private static final int MAX_CONTENT_LENGTH = 8000;

    private final ArticleMapper articleMapper;

    public ArticleTools(ArticleMapper articleMapper) {
        this.articleMapper = articleMapper;
    }

    @Tool(name = "getArticleBySlug",
            description = "根据 slug 获取博客文章的完整内容。slug 来自 listRecentArticles 或相关问题中的相关文章列表。")
    public String getArticleBySlug(@ToolParam(description = "文章 slug") String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null || !"PUBLISHED".equals(article.getStatus())) {
            return "未找到 slug 为「" + slug + "」的已发布文章。";
        }
        String body = article.getContentMd() == null ? "" : article.getContentMd();
        if (body.length() > MAX_CONTENT_LENGTH) {
            body = body.substring(0, MAX_CONTENT_LENGTH) + "\n…（正文过长已截断）";
        }
        return String.format("《%s》\n%s", article.getTitle(), body);
    }

    @Tool(name = "listRecentArticles",
            description = "列出最近发布的博客文章，返回标题、slug、摘要和发布日期。用户问「有哪些文章」「最近写了什么」时使用。")
    public String listRecentArticles(
            @ToolParam(description = "返回数量，默认 5，最多 10", required = false) Integer count) {
        int n = (count == null || count <= 0) ? 5 : Math.min(count, 10);
        List<Article> articles = articleMapper.findPublished(Map.of("offset", 0, "size", n));
        if (articles.isEmpty()) {
            return "暂无已发布文章。";
        }
        return articles.stream()
                .map(a -> String.format("- 《%s》(slug: %s, 发布于 %s)\n  %s",
                        a.getTitle(), a.getSlug(), a.getPublishDate(),
                        a.getExcerpt() == null ? "" : a.getExcerpt()))
                .collect(Collectors.joining("\n"));
    }
}
