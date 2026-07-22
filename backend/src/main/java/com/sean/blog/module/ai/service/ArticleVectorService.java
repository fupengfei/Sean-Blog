package com.sean.blog.module.ai.service;

import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingRequest;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * ArticleVectorService — 文章向量化服务
 *
 * 负责：
 * 1. 将文章文本调用 embedding API 转为向量
 * 2. 向量存入 Lucene HNSW 索引
 * 3. 根据用户查询检索相关文章
 *
 * 文本截断到 4000 字符以适应 embedding 模型的 token 限制
 */
@Service
public class ArticleVectorService {

    private static final Logger log = LoggerFactory.getLogger(ArticleVectorService.class);

    private final LuceneVectorService lucene;
    private final EmbeddingModel embeddingModel;
    private final ArticleMapper articleMapper;

    /** embedding 文本最大长度（字符数），4000 字符 ≈ 2000-4000 tokens */
    private static final int MAX_TEXT_LENGTH = 4000;

    public ArticleVectorService(LuceneVectorService lucene,
                                 EmbeddingModel embeddingModel,
                                 ArticleMapper articleMapper) {
        this.lucene = lucene;
        this.embeddingModel = embeddingModel;
        this.articleMapper = articleMapper;
    }

    /**
     * 启动后异步索引所有已发布文章
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onReady() {
        new Thread(() -> {
            try {
                Thread.sleep(3000); // 等应用完全就绪
                int count = rebuildAll();
                log.info("Startup vector indexing complete, {} articles indexed", count);
            } catch (Exception e) {
                log.error("Startup vector indexing failed", e);
            }
        }, "vector-index-init").start();
    }

    // -----------------------------------------------------------------------
    // 公开 API
    // -----------------------------------------------------------------------

    /**
     * 索引单篇文章
     */
    public void indexArticle(Article article) {
        try {
            String text = buildText(article);
            float[] vector = embed(text);
            lucene.index(
                    article.getId().toString(),
                    article.getTitle(),
                    article.getExcerpt() != null ? article.getExcerpt() : "",
                    vector
            );
            log.debug("Indexed article id={}, title={}", article.getId(), article.getTitle());
        } catch (Exception e) {
            log.error("Failed to index article id={}: {}", article.getId(), e.getMessage());
        }
    }

    /**
     * 从索引中删除文章
     */
    public void deleteArticle(Long articleId) {
        try {
            lucene.deleteByIds(List.of(articleId.toString()));
            log.debug("Deleted article id={} from vector index", articleId);
        } catch (IOException e) {
            log.error("Failed to delete article id={} from index", articleId, e);
        }
    }

    /**
     * 语义搜索相关文章
     *
     * @param query 用户查询文本
     * @param k     返回数量
     * @return 相关文章列表（id + title + content 摘要 + 相似度分数）
     */
    public List<LuceneVectorService.SearchResult> search(String query, int k) {
        try {
            float[] vector = embed(query);
            return lucene.search(vector, k);
        } catch (Exception e) {
            log.error("Vector search failed: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * 重建整个索引（从数据库重新读取所有已发布文章）
     *
     * @return 已索引的文章数量
     */
    public int rebuildAll() {
        try {
            List<Article> articles = articleMapper.findPublished(Map.of(
                    "offset", 0,
                    "size", Integer.MAX_VALUE
            ));

            if (articles.isEmpty()) {
                log.info("No published articles to index");
                return 0;
            }

            var entries = articles.stream()
                    .map(article -> {
                        String text = buildText(article);
                        float[] vector = embed(text);
                        return new LuceneVectorService.DocEntry(
                                article.getId().toString(),
                                article.getTitle(),
                                article.getExcerpt() != null ? article.getExcerpt() : "",
                                vector
                        );
                    })
                    .toList();

            lucene.rebuild(entries);
            log.info("Rebuilt vector index with {} articles", entries.size());
            return entries.size();
        } catch (Exception e) {
            log.error("Failed to rebuild vector index", e);
            return 0;
        }
    }

    /**
     * 获取索引中的文档数
     */
    public int docCount() {
        return lucene.docCount();
    }

    // -----------------------------------------------------------------------
    // 内部方法
    // -----------------------------------------------------------------------

    /**
     * 从文章构建 embedding 输入文本
     */
    private String buildText(Article article) {
        StringBuilder sb = new StringBuilder();
        sb.append(article.getTitle());

        String content = article.getContentMd();
        if (content != null && !content.isEmpty()) {
            sb.append("\n\n");
            if (content.length() > MAX_TEXT_LENGTH) {
                sb.append(content, 0, MAX_TEXT_LENGTH);
            } else {
                sb.append(content);
            }
        }

        return sb.toString();
    }

    /**
     * 调用 embedding API 将文本转为向量
     */
    private float[] embed(String text) {
        var request = new EmbeddingRequest(List.of(text), null);
        var response = embeddingModel.call(request);
        if (response.getResults().isEmpty()) {
            throw new RuntimeException("Embedding API returned empty result");
        }
        return response.getResults().get(0).getOutput();
    }
}
