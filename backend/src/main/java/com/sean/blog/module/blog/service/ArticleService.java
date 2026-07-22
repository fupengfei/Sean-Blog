package com.sean.blog.module.blog.service;

import com.sean.blog.common.BusinessException;
import com.sean.blog.common.PageResult;
import com.sean.blog.common.SnowflakeIdGenerator;
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
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

import static java.util.regex.Pattern.MULTILINE;

/**
 * 文章核心业务逻辑服务。
 *
 * <p>负责文章的全生命周期管理，包括：</p>
 * <ul>
 *   <li><b>双存储策略</b>：Markdown 原文同时存入数据库和宿主机文件系统（{@value articlesPath}/{articleId}/article.md），
 *       HTML 渲染结果仅存数据库用于前台展示。</li>
 *   <li><b>Markdown 解析</b>：使用 flexmark 库将 Markdown 渲染为 HTML，自动提取标题（第一个 # 标题）和摘要。</li>
 *   <li><b>Slug 生成</b>：根据标题生成 URL 友好的唯一标识（格式：{title-slug}-{timestamp}）。</li>
 *   <li><b>软删除</b>：将文章状态设为 DELETED，同时物理删除对应的 MD 文件。</li>
 *   <li><b>文章关联</b>：支持双向多对多关联，带有自引用和重复引用防护。</li>
 * </ul>
 */
@Service
public class ArticleService {

    private final ArticleMapper articleMapper;
    private final ArticleRelatedMapper articleRelatedMapper;
    private final SnowflakeIdGenerator idGenerator;
    private final String articlesPath;
    private final Parser parser;
    private final HtmlRenderer renderer;

    /** 匹配 Markdown 一级标题的正则，用于自动提取文章标题 */
    private static final Pattern TITLE_PATTERN = Pattern.compile("^#\\s+(.+)$", MULTILINE);
    /** 匹配 Markdown 语法的正则，用于从正文提取纯文本摘要 */
    private static final Pattern MARKDOWN_PATTERN = Pattern.compile("[#*>`\\-\\[\\]()!~_]");

    public ArticleService(ArticleMapper articleMapper,
                          ArticleRelatedMapper articleRelatedMapper,
                          SnowflakeIdGenerator idGenerator,
                          @Value("${file.upload.articles}") String articlesPath) {
        this.articleMapper = articleMapper;
        this.articleRelatedMapper = articleRelatedMapper;
        this.idGenerator = idGenerator;
        this.articlesPath = articlesPath;
        this.parser = Parser.builder().build();
        this.renderer = HtmlRenderer.builder().build();
    }

    /**
     * 从 Markdown 文件创建新文章。
     *
     * <p>处理流程：</p>
     * <ol>
     *   <li>读取上传的 MD 文件内容</li>
     *   <li>如果未提供标题，自动从 MD 第一个 # 标题提取；若仍为空则使用文件名</li>
     *   <li>使用 flexmark 将 MD 渲染为 HTML</li>
     *   <li>如果未提供描述，自动从 MD 提取纯文本摘要（最多 200 字符）</li>
     *   <li>生成 URL 友好的 slug</li>
     *   <li>文章信息写入数据库</li>
     *   <li>关联标签写入 article_tag 中间表</li>
     *   <li>MD 文件保存到宿主机目录</li>
     * </ol>
     *
     * @param file       上传的 Markdown 文件
     * @param categoryId 所属分类 ID
     * @param tagIds     关联的标签 ID 列表
     * @param isFeatured 是否设为精选
     * @param author     作者
     * @param title      标题（可选，为空时自动提取）
     * @param description 摘要描述（可选，为空时自动生成）
     * @param publishDate 发布日期（可选，为空时使用当前日期）
     * @return 创建后的文章对象
     */
    public Article createFromMd(MultipartFile file, Long categoryId, List<Long> tagIds,
                                  boolean isFeatured, String author, String title, String description,
                                  LocalDate publishDate) {
        String contentMd;
        try {
            contentMd = new String(file.getBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new BusinessException("读取文件失败");
        }

        // 如果没填标题，从 MD 中提取
        if (title == null || title.trim().isEmpty()) {
            title = extractTitle(contentMd);
        }
        if (title == null) {
            title = file.getOriginalFilename();
            if (title != null && title.toLowerCase().endsWith(".md")) {
                title = title.substring(0, title.length() - 3);
            }
        }

        Node document = parser.parse(contentMd);
        String contentHtml = renderer.render(document);

        // 如果没填描述，从 MD 中自动生成
        String excerpt;
        if (description != null && !description.trim().isEmpty()) {
            excerpt = description.trim();
        } else {
            excerpt = extractExcerpt(contentMd);
        }

        String slug = generateSlug(title);

        Article article = new Article();
        article.setId(idGenerator.nextId());
        article.setTitle(title);
        article.setSlug(slug);
        article.setContentMd(contentMd);
        article.setContentHtml(contentHtml);
        article.setExcerpt(excerpt);
        article.setAuthor(author);
        article.setPublishDate(publishDate != null ? publishDate : LocalDate.now());
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

    /**
     * 更新文章信息。
     *
     * <p>如果上传了新的 MD 文件，会重新解析渲染、删除旧 MD 文件并写入新文件。
     * 如果未提供描述但上传了新文件，摘要会从新 MD 自动重新生成。
     * 标签采用全量替换策略（先删后插）。</p>
     *
     * @param id          文章 ID
     * @param file        新的 Markdown 文件（可选）
     * @param categoryId  所属分类 ID
     * @param tagIds      关联的标签 ID 列表（全量替换）
     * @param isFeatured  是否设为精选
     * @param author      作者
     * @param title       标题（可选）
     * @param description 摘要描述（可选）
     * @param publishDate 发布日期（可选）
     * @return 更新后的文章对象
     */
    @Transactional
    public Article updateArticle(Long id, MultipartFile file, Long categoryId, List<Long> tagIds,
                                  boolean isFeatured, String author, String title, String description,
                                  LocalDate publishDate) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }

        String contentMd = article.getContentMd();
        String contentHtml = article.getContentHtml();

        // 如果上传了新 MD 文件，替换内容并物理删除旧文件
        if (file != null && !file.isEmpty()) {
            try {
                contentMd = new String(file.getBytes(), StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new BusinessException("读取文件失败");
            }

            Node document = parser.parse(contentMd);
            contentHtml = renderer.render(document);

            // 物理删除旧文件
            Path articleDir = Paths.get(articlesPath, id.toString());
            Path oldMdFile = articleDir.resolve("article.md");
            try {
                Files.deleteIfExists(oldMdFile);
            } catch (IOException e) {
                // 删除失败不阻塞，日志记录
            }

            // 写入新文件
            try {
                Files.createDirectories(articleDir);
                Files.writeString(oldMdFile, contentMd, StandardCharsets.UTF_8);
            } catch (IOException e) {
                throw new BusinessException("保存文件失败");
            }
        }

        // 更新标题
        if (title != null && !title.trim().isEmpty()) {
            article.setTitle(title.trim());
        }

        // 更新描述
        if (description != null && !description.trim().isEmpty()) {
            article.setExcerpt(description.trim());
        } else if (file != null && !file.isEmpty()) {
            // 重新上传了 MD 但没有填描述，重新自动生成
            article.setExcerpt(extractExcerpt(contentMd));
        }

        article.setContentMd(contentMd);
        article.setContentHtml(contentHtml);
        article.setAuthor(author);
        if (publishDate != null) {
            article.setPublishDate(publishDate);
        }
        article.setCategoryId(categoryId);
        article.setIsFeatured(isFeatured);

        articleMapper.update(article);

        // 更新标签
        if (tagIds != null) {
            articleMapper.deleteArticleTags(id);
            for (Long tagId : tagIds) {
                articleMapper.insertArticleTag(id, tagId);
            }
        }

        return articleMapper.findById(id);
    }

    /**
     * 根据 slug 查询文章详情（含浏览计数 +1）。
     *
     * <p>slug 由 {@link #generateSlug(String)} 生成，用于 SEO 友好的 URL 访问。</p>
     *
     * @param slug 文章 slug
     * @return 文章对象
     * @throws BusinessException 文章不存在时抛出 404
     */
    public Article getBySlug(String slug) {
        Article article = articleMapper.findBySlug(slug);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.incrementViewCount(article.getId());
        return article;
    }

    /**
     * 根据 ID 查询已发布的文章（含浏览计数 +1）。
     *
     * @param id 文章 ID
     * @return 文章对象
     * @throws BusinessException 文章不存在时抛出 404
     */
    public Article getPublishedById(Long id) {
        Article article = articleMapper.findPublishedById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.incrementViewCount(article.getId());
        return article;
    }

    /**
     * 根据 ID 查询已发布的文章（无副作用，不增加浏览次数）。
     *
     * <p>供 AI 模块内部加载文章内容使用；前台详情页展示请用 {@link #getPublishedById(Long)}（含浏览计数）。</p>
     *
     * @param id 文章 ID
     * @return 文章对象；不存在或未发布时返回 null
     */
    public Article findPublishedById(Long id) {
        return articleMapper.findPublishedById(id);
    }

    /**
     * 分页查询已发布文章列表。
     *
     * @param page       页码（从 1 开始）
     * @param size       每页大小（1-100）
     * @param categoryId 分类筛选（可选）
     * @param tagId      标签筛选（可选）
     * @param keyword    关键词搜索（可选，匹配标题和内容）
     * @return 分页结果
     */
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

    /**
     * 获取精选文章列表。
     *
     * @param limit 返回数量上限
     * @return 精选文章列表
     */
    public List<Article> getFeatured(int limit) {
        return articleMapper.findFeatured(limit);
    }

    /**
     * Admin 端分页查询所有文章（含草稿和已删除）。
     *
     * @param page    页码（从 1 开始）
     * @param size    每页大小（1-100）
     * @param keyword 关键词搜索（可选）
     * @return 分页结果
     */
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

    /**
     * 更新文章状态。
     *
     * <p>当状态设为 DELETED 时，除了数据库软删除外，还会物理删除宿主机上的 MD 文件目录，
     * 确保存储空间得到释放。</p>
     *
     * @param id     文章 ID
     * @param status 新状态（DRAFT / PUBLISHED / DELETED）
     */
    public void updateStatus(Long id, String status) {
        articleMapper.updateStatus(id, status);
        // 逻辑删除时物理删除文件
        if ("DELETED".equals(status)) {
            Path articleDir = Paths.get(articlesPath, id.toString());
            try {
                if (Files.exists(articleDir)) {
                    try (var files = Files.walk(articleDir)) {
                        files.sorted(java.util.Comparator.reverseOrder())
                             .forEach(p -> {
                                 try { Files.deleteIfExists(p); } catch (IOException ignored) {}
                             });
                    }
                }
            } catch (IOException e) {
                // 删除文件失败不阻塞数据库操作
            }
        }
    }

    /**
     * Admin 端根据 ID 查询文章（含草稿和已删除）。
     *
     * @param id 文章 ID
     * @return 文章对象
     * @throws BusinessException 文章不存在时抛出 404
     */
    public Article getById(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        return article;
    }

    /**
     * 切换文章精选状态（反转当前 isFeatured 值）。
     *
     * @param id 文章 ID
     * @throws BusinessException 文章不存在时抛出 404
     */
    public void toggleFeatured(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.updateFeatured(id, !Boolean.TRUE.equals(article.getIsFeatured()));
    }

    // ========== 公开接口：文章关联查询 ==========

    /**
     * 根据 slug 查询文章的前置文章。
     *
     * @param slug 文章 slug
     * @return 前置文章对象（可能为 null）
     */
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

    /**
     * 根据前置文章 ID 查询前置文章摘要。
     *
     * @param prerequisiteId 前置文章 ID
     * @return 前置文章对象（可能为 null）
     */
    public Article getPrerequisiteByArticleId(Long prerequisiteId) {
        List<Article> results = articleMapper.findSummaryByIds(List.of(prerequisiteId));
        return results.isEmpty() ? null : results.get(0);
    }

    /**
     * 根据 slug 查询文章的关联文章列表。
     *
     * @param slug 文章 slug
     * @return 关联文章列表（可能为空）
     */
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

    /**
     * 根据 ID 查询文章的关联文章列表。
     *
     * @param id 文章 ID
     * @return 关联文章列表（可能为空）
     */
    public List<Article> getRelatedById(Long id) {
        List<Long> relatedIds = articleRelatedMapper.findRelatedArticleIds(id);
        if (relatedIds.isEmpty()) {
            return List.of();
        }
        return articleMapper.findSummaryByIds(relatedIds);
    }

    // ========== 公开接口：下一篇 ==========

    /**
     * 根据文章 ID 查询下一篇文章（导航流）。
     *
     * @param id 当前文章 ID
     * @return 下一篇文章对象（可能为 null）
     */
    public Article getNextArticle(Long id) {
        Article article = articleMapper.findPublishedById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        if (article.getNextArticleId() == null) {
            return null;
        }
        Article next = articleMapper.findPublishedById(article.getNextArticleId());
        return next;
    }

    // ========== Admin 接口：文章关联管理 ==========

    /**
     * 获取文章的所有关系信息（前置文章、下一篇、关联文章）。
     *
     * @param id 文章 ID
     * @return 包含 prerequisite、nextArticle、related 三个键的 Map
     */
    public Map<String, Object> getRelations(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }

        Article prerequisite = null;
        if (article.getPrerequisiteId() != null) {
            prerequisite = articleMapper.findById(article.getPrerequisiteId());
        }

        Article nextArticle = null;
        if (article.getNextArticleId() != null) {
            nextArticle = articleMapper.findById(article.getNextArticleId());
        }

        List<Long> relatedIds = articleRelatedMapper.findRelatedArticleIds(id);
        List<Article> related = relatedIds.isEmpty()
                ? List.of()
                : articleMapper.findSummaryByIds(relatedIds);

        Map<String, Object> result = new HashMap<>();
        result.put("prerequisite", prerequisite != null
                ? Map.of("id", prerequisite.getId(), "title", prerequisite.getTitle())
                : null);
        result.put("nextArticle", nextArticle != null
                ? Map.of("id", nextArticle.getId(), "title", nextArticle.getTitle())
                : null);
        result.put("related", related.stream()
                .map(a -> Map.of("id", a.getId(), "title", a.getTitle()))
                .toList());
        return result;
    }

    /**
     * 设置文章的下一篇。
     *
     * @param id            文章 ID
     * @param nextArticleId 下一篇文章 ID（null 表示清除）
     * @throws BusinessException 文章不存在或自引用时抛出
     */
    public void setNextArticle(Long id, Long nextArticleId) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        if (nextArticleId != null && nextArticleId.equals(id)) {
            throw new BusinessException("不能将文章自身设为下一篇");
        }
        if (nextArticleId != null) {
            Article next = articleMapper.findById(nextArticleId);
            if (next == null) {
                throw new BusinessException(404, "目标文章不存在");
            }
        }
        articleMapper.setNextArticle(id, nextArticleId);
    }

    /**
     * 清除文章的下一篇设置。
     *
     * @param id 文章 ID
     */
    public void removeNextArticle(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.clearNextArticle(id);
    }

    /**
     * 设置文章的前置文章。
     *
     * <p>带有循环引用防护：不允许将文章自身设为前置文章。</p>
     *
     * @param id             文章 ID
     * @param prerequisiteId 前置文章 ID（null 表示清除）
     * @throws BusinessException 文章不存在或自引用时抛出
     */
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

    /**
     * 清除文章的前置文章设置。
     *
     * @param id 文章 ID
     */
    public void removePrerequisite(Long id) {
        Article article = articleMapper.findById(id);
        if (article == null) {
            throw new BusinessException(404, "文章不存在");
        }
        articleMapper.clearPrerequisite(id);
    }

    /**
     * 设置文章的关联文章列表（全量替换）。
     *
     * <p>关联是双向的：设置文章 A 关联文章 B 时，会同时写入 (A→B) 和 (B→A) 两条记录。
     * 带有自引用和重复引用防护。已移除的关联执行软删除。</p>
     *
     * @param id         文章 ID
     * @param relatedIds 关联文章 ID 列表
     * @throws BusinessException 文章不存在或部分关联文章不存在时抛出
     */
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
                record.setId(idGenerator.nextId());
                record.setArticleId(id);
                record.setRelatedArticleId(relatedId);
                record.setCreatedBy(currentUser);
                record.setUpdatedBy(currentUser);
                articleRelatedMapper.insert(record);

                ArticleRelated reverse = new ArticleRelated();
                reverse.setId(idGenerator.nextId());
                reverse.setArticleId(relatedId);
                reverse.setRelatedArticleId(id);
                reverse.setCreatedBy(currentUser);
                reverse.setUpdatedBy(currentUser);
                articleRelatedMapper.insert(reverse);
            }
        }
    }

    /**
     * 从 Markdown 内容中提取标题（匹配第一个 # 一级标题）。
     *
     * @param contentMd Markdown 原文
     * @return 提取的标题，未找到时返回 null
     */
    String extractTitle(String contentMd) {
        var matcher = TITLE_PATTERN.matcher(contentMd);
        if (matcher.find()) {
            return matcher.group(1).trim();
        }
        return null;
    }

    /**
     * 从 Markdown 内容中提取纯文本摘要。
     *
     * <p>先移除所有 Markdown 语法符号，再将换行替换为空格，最多保留 200 字符。</p>
     *
     * @param contentMd Markdown 原文
     * @return 纯文本摘要
     */
    String extractExcerpt(String contentMd) {
        String plain = MARKDOWN_PATTERN.matcher(contentMd).replaceAll("");
        plain = plain.replaceAll("\n+", " ").trim();
        if (plain.length() > 200) {
            return plain.substring(0, 200) + "...";
        }
        return plain;
    }

    /**
     * 根据标题生成 URL 友好的 slug。
     *
     * <p>生成规则：标题转小写 → 去除非字母数字和中文字符 → 空格替换为横线 →
     * 连续横线合并 → 去掉首尾横线 → 追加时间戳确保唯一性。</p>
     *
     * @param title 文章标题
     * @return slug 字符串，格式：{title-slug}-{timestamp}
     */
    String generateSlug(String title) {
        String slug = title.toLowerCase()
                .replaceAll("[^a-z0-9\\u4e00-\\u9fa5\\s-]", "")
                .replaceAll("[\\s]+", "-")
                .replaceAll("-+", "-")
                .replaceAll("^-|-$", "");
        return slug + "-" + System.currentTimeMillis();
    }
}
