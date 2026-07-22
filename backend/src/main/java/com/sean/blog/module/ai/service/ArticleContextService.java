package com.sean.blog.module.ai.service;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.service.ArticleService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * ArticleContextService — 构建「当前文章」上下文区块。
 *
 * <p>供 AI 聊天在文章详情页感知用户正在阅读的文章：
 * 按 articleId 加载已发布文章全文，格式化为「---当前文章---」区块注入 prompt。</p>
 *
 * <p>所有异常路径都返回 {@link Optional#empty()}（降级不中断聊天）。</p>
 */
@Service
public class ArticleContextService {

    private static final Logger log = LoggerFactory.getLogger(ArticleContextService.class);

    /** 注入 prompt 的文章正文最大长度（字符数），超出截断 */
    static final int MAX_CONTENT_LENGTH = 30000;

    private final ArticleService articleService;

    public ArticleContextService(ArticleService articleService) {
        this.articleService = articleService;
    }

    /**
     * 构建「当前文章」区块。
     *
     * @param articleId 用户正在阅读的文章 ID（可为 null）
     * @return 区块文本；articleId 非法、文章不存在/未发布、内容为空或发生异常时返回 empty
     */
    public Optional<String> buildArticleContext(Long articleId) {
        if (articleId == null || articleId <= 0) {
            return Optional.empty();
        }
        try {
            Article article = articleService.findPublishedById(articleId);
            if (article == null) {
                log.warn("Article context skipped: article {} not found or not published", articleId);
                return Optional.empty();
            }

            String body = article.getContentMd();
            if (body == null || body.isBlank()) {
                body = article.getExcerpt();
            }
            if (body == null || body.isBlank()) {
                return Optional.empty();
            }
            if (body.length() > MAX_CONTENT_LENGTH) {
                body = body.substring(0, MAX_CONTENT_LENGTH) + "\n…（内容过长已截断）";
            }

            return Optional.of(String.format("---当前文章---\n《%s》\n%s\n---当前文章结束---",
                    article.getTitle(), body));
        } catch (Exception e) {
            log.warn("Article context loading failed for id={}: {}", articleId, e.getMessage());
            return Optional.empty();
        }
    }
}
