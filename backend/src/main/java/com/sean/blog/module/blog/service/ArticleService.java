package com.sean.blog.module.blog.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.PageResult;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.entity.ArticleRelated;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import com.sean.blog.module.blog.mapper.ArticleRelatedMapper;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static java.util.regex.Pattern.MULTILINE;

@Service
public class ArticleService {

    private final ArticleMapper articleMapper;
    private final ArticleRelatedMapper articleRelatedMapper;
    private final String articlesPath;
    private final Parser parser;
    private final HtmlRenderer renderer;

    private static final Pattern TITLE_PATTERN = Pattern.compile("^#\\s+(.+)$", MULTILINE);
    private static final Pattern MARKDOWN_PATTERN = Pattern.compile("[#*>`\\-\\[\\]()!~_]");

    public ArticleService(ArticleMapper articleMapper,
                          ArticleRelatedMapper articleRelatedMapper,
                          @Value("${file.upload.articles}") String articlesPath) {
        this.articleMapper = articleMapper;
        this.articleRelatedMapper = articleRelatedMapper;
        this.articlesPath = articlesPath;
        this.parser = Parser.builder().build();
        this.renderer = HtmlRenderer.builder().build();
    }

    public Article createFromMd(MultipartFile file, Long categoryId, List<Long> tagIds, boolean isFeatured, String author) {
        String contentMd;
        try {
            contentMd = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BusinessException("读取文件失败");
        }

        String title = extractTitle(contentMd);
        if (title == null) {
            title = file.getOriginalFilename();
            if (title != null && title.toLowerCase().endsWith(".md")) {
                title = title.substring(0, title.length() - 3);
            }
        }

        Node document = parser.parse(contentMd);
        String contentHtml = renderer.render(document);

        String excerpt = extractExcerpt(contentMd);
        String slug = generateSlug(title);

        Article article = new Article();
        article.setTitle(title);
        article.setSlug(slug);
        article.setContentMd(contentMd);
        article.setContentHtml(contentHtml);
        article.setExcerpt(excerpt);
        article.setAuthor(author);
        article.setCategoryId(categoryId);
        article.setStatus("DRAFT");
        article.setIsFeatured(isFeatured);
        article.setViewCount(0L);

        articleMapper.insert(article);

        if (tagIds != null && !tagIds.isEmpty()) {
            for (Long tagId : tagIds) {
                articleMapper.insertArticleTag(article.getId(), tagId);
            }
        }

        try {
            Path articleDir = Paths.get(articlesPath, article.getId().toString());
            Files.createDirectories(articleDir);
            Path mdFile = articleDir.resolve("article.md");
            Files.writeString(mdFile, contentMd, StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BusinessException("保存文件失败");
        }

        return article;
    }

    public Article getBySlug(String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.incrementViewCount(article.getId());
        return article;
    }

    public PageResult<Article> listPublished(int page, int size, Long categoryId, Long tagId, String keyword) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 10;

        Map<String, Object> params = new HashMap<>();
        params.put("offset", (page - 1) * size);
        params.put("size", size);
        if (categoryId != null) {
            params.put("categoryId", categoryId);
        }
        if (tagId != null) {
            params.put("tagId", tagId);
        }
        if (keyword != null && !keyword.trim().isEmpty()) {
            params.put("keyword", keyword.trim());
        }

        List<Article> list = articleMapper.findPublished(params);
        long total = articleMapper.countPublished(params);
        return new PageResult<>(list, total, page, size);
    }

    public List<Article> getFeatured(int limit) {
        return articleMapper.findFeatured(limit);
    }

    public PageResult<Article> listAll(int page, int size, String keyword) {
        if (page < 1) page = 1;
        if (size < 1 || size > 100) size = 10;

        Map<String, Object> params = new HashMap<>();
        params.put("offset", (page - 1) * size);
        params.put("size", size);
        if (keyword != null && !keyword.trim().isEmpty()) {
            params.put("keyword", keyword.trim());
        }

        List<Article> list = articleMapper.findAll(params);
        long total = articleMapper.countAll(params);
        return new PageResult<>(list, total, page, size);
    }

    public void updateStatus(Long id, String status) {
        articleMapper.updateStatus(id, status);
    }

    public Article getById(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        return article;
    }

    public void toggleFeatured(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.updateFeatured(id, !Boolean.TRUE.equals(article.getIsFeatured()));
    }

    // ========== 公开接口：文章关联查询 ==========

    public Article getPrerequisite(String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        if (article.getPrerequisiteId() == null) {
            return null;
        }
        List<Article> results = articleMapper.findSummaryByIds(List.of(article.getPrerequisiteId()));
        return results.isEmpty() ? null : results.get(0);
    }

    public List<Article> getRelated(String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        List<Long> relatedIds = articleRelatedMapper.findRelatedArticleIds(article.getId());
        if (relatedIds.isEmpty()) {
            return List.of();
        }
        return articleMapper.findSummaryByIds(relatedIds);
    }

    // ========== Admin 接口：文章关联管理 ==========

    public Map<String, Object> getRelations(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }

        Article prerequisite = null;
        if (article.getPrerequisiteId() != null) {
            prerequisite = articleMapper.findById(article.getPrerequisiteId());
        }

        List<Long> relatedIds = articleRelatedMapper.findRelatedArticleIds(id);
        List<Article> related = relatedIds.isEmpty()
                ? List.of()
                : articleMapper.findSummaryByIds(relatedIds);

        Map<String, Object> result = new HashMap<>();
        result.put("prerequisite", prerequisite != null
                ? Map.of("id", prerequisite.getId(), "title", prerequisite.getTitle())
                : null);
        result.put("related", related.stream()
                .map(a -> Map.of("id", a.getId(), "title", a.getTitle()))
                .toList());
        return result;
    }

    public void setPrerequisite(Long id, Long prerequisiteId) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        // 防止循环引用
        if (prerequisiteId != null && prerequisiteId.equals(id)) {
            throw new BusinessException("不能将文章自身设为前置文章");
        }
        if (prerequisiteId != null) {
            Article prereq = articleMapper.findById(prerequisiteId);
            if (prereq == null) {
                throw new BusinessException(404, "前置文章不存在");
            }
        }
        articleMapper.setPrerequisite(id, prerequisiteId);
    }

    public void removePrerequisite(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.clearPrerequisite(id);
    }

    @Transactional
    public void setRelated(Long id, List<Long> relatedIds) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        // 防止自引用
        relatedIds = relatedIds != null
                ? relatedIds.stream().filter(rid -> !rid.equals(id)).toList()
                : List.of();
        // 防止重复
        relatedIds = relatedIds.stream().distinct().toList();

        // Validate all related article IDs exist
        if (!relatedIds.isEmpty()) {
            List<Article> foundArticles = articleMapper.findSummaryByIds(relatedIds);
            if (foundArticles.size() != relatedIds.size()) {
                throw new BusinessException("部分关联文章不存在");
            }
        }

        // 查询当前关联
        List<Long> existingIds = articleRelatedMapper.findRelatedArticleIds(id);

        // 删除已移除的关系
        String currentUser = "admin"; // 单用户 blog，固定 admin
        for (Long existingId : existingIds) {
            if (!relatedIds.contains(existingId)) {
                articleRelatedMapper.softDeletePair(id, existingId, currentUser);
            }
        }

        // 插入新关系（双向写入）
        for (Long relatedId : relatedIds) {
            if (!existingIds.contains(relatedId)) {
                ArticleRelated record = new ArticleRelated();
                record.setArticleId(id);
                record.setRelatedArticleId(relatedId);
                record.setCreatedBy(currentUser);
                record.setUpdatedBy(currentUser);
                articleRelatedMapper.insert(record);

                ArticleRelated reverse = new ArticleRelated();
                reverse.setArticleId(relatedId);
                reverse.setRelatedArticleId(id);
                reverse.setCreatedBy(currentUser);
                reverse.setUpdatedBy(currentUser);
                articleRelatedMapper.insert(reverse);
            }
        }
    }

    String extractTitle(String contentMd) {
        var matcher = TITLE_PATTERN.matcher(contentMd);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    String extractExcerpt(String contentMd) {
        String plain = MARKDOWN_PATTERN.matcher(contentMd).replaceAll("");
        plain = plain.replaceAll("\n+", " ").trim();
        if (plain.length() > 200) {
            return plain.substring(0, 200) + "...";
        }
        return plain;
    }

    String generateSlug(String title) {
        String slug = title.toLowerCase()
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s-]", "")
                .replaceAll("[\\s]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return slug + "-" + System.currentTimeMillis();
    }
}
