package com.sean.blog.module.blog.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.PageResult;
import com.sean.blog.module.blog.entity.Article;
import com.sean.blog.module.blog.mapper.ArticleMapper;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
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
    private final String articlesPath;
    private final Parser parser;
    private final HtmlRenderer renderer;

    private static final Pattern TITLE_PATTERN = Pattern.compile("^#\\s+(.+)$", MULTILINE);
    private static final Pattern MARKDOWN_PATTERN = Pattern.compile("[#*>`\\-\\[\\]()!~_]");

    public ArticleService(ArticleMapper articleMapper,
                          @Value("${file.upload.articles}") String articlesPath) {
        this.articleMapper = articleMapper;
        this.articlesPath = articlesPath;
        this.parser = Parser.builder().build();
        this.renderer = HtmlRenderer.builder().build();
    }

    public Article createFromMd(MultipartFile file, Long categoryId, List<Long> tagIds, boolean isFeatured) {
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
        article.setViewCount(article.getViewCount() + 1);
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

    public void toggleFeatured(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.updateFeatured(id, !Boolean.TRUE.equals(article.getIsFeatured()));
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
