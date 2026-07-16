# 文章关联功能 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为博客文章增加前置文章（单向）和相关文章（双向）两种关联关系。

**Architecture:** 数据库层自引用外键 + 关联表；后端新增独立 API 端点返回精简 Article 摘要；前端在文章详情页顶部加 PrerequisiteBanner、侧边栏 TOC 下加前置标签、底部 RelatedArticles 替换为真实关联数据。

**Tech Stack:** Spring Boot 4.x + MyBatis + MySQL 8.0 / Next.js 14 + TypeScript + Tailwind CSS

## Global Constraints

- 遵循 `sean-dev-standards` 审计字段规范：所有表含 `created_by`、`created_at`、`updated_by`、`updated_at`、`is_deleted`
- 所有删除为软删除，查询必须带上 `is_deleted = 0`
- 公开 API `/api/v1/*`，Admin API `/api/v1/admin/*`
- 前端设计规范：Navy `#002045` + Green `#0a6c44`，8px 间距体系，卡片边框 `1px solid #E2E8F0`
- 前置文章最多 1 篇，相关文章不限制数量

---

### Task 1: 数据库迁移脚本 V3

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__article_related.sql`

**Interfaces:**
- Produces: `t_article.prerequisite_id` (BIGINT, FK → t_article.id), `t_article_related` 表（含所有审计字段）

- [ ] **Step 1: 创建迁移脚本**

```sql
-- V3: 文章关联功能

ALTER TABLE t_article
  ADD COLUMN prerequisite_id BIGINT DEFAULT NULL COMMENT '前置文章ID，建议先阅读' AFTER category_id,
  ADD INDEX idx_prerequisite_id (prerequisite_id),
  ADD FOREIGN KEY (prerequisite_id) REFERENCES t_article(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS t_article_related (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    article_id BIGINT NOT NULL COMMENT '文章A',
    related_article_id BIGINT NOT NULL COMMENT '文章B',
    created_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '创建人',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by VARCHAR(100) NOT NULL DEFAULT '' COMMENT '修改人',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '修改时间',
    is_deleted TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否删除 0=正常 1=已删除',
    INDEX idx_is_deleted (is_deleted),
    INDEX idx_article_id (article_id),
    INDEX idx_related_article_id (related_article_id),
    FOREIGN KEY (article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    FOREIGN KEY (related_article_id) REFERENCES t_article(id) ON DELETE CASCADE,
    UNIQUE KEY uk_pair (article_id, related_article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

- [ ] **Step 2: 同时更新 schema.sql**

`backend/src/main/resources/schema.sql` 仅用于参考，在 t_article 建表语句中增加 `prerequisite_id` 字段，追加 `t_article_related` 建表语句。

在 `t_article` 的 `category_id BIGINT` 之后添加：

```sql
prerequisite_id BIGINT COMMENT '前置文章ID，建议先阅读',
```

在文件末尾追加 `t_article_related` 建表语句（与 V3 迁移脚本相同）。

- [ ] **Step 3: 在 Docker 中执行迁移并验证**

```bash
docker compose exec mysql mysql -u root -p blog -e "DESCRIBE t_article;" | grep prerequisite
docker compose exec mysql mysql -u root -p blog -e "DESCRIBE t_article_related;"
```

Expected: `prerequisite_id` 列出现在 t_article 中，t_article_related 表存在且有 5 个审计字段。

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/resources/db/migration/V3__article_related.sql backend/src/main/resources/schema.sql
git commit -m "feat(db): 添加文章关联功能数据库迁移 V3

t_article 添加 prerequisite_id 自引用字段，新建 t_article_related 关联表。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 2: 后端 — ArticleRelated 实体 + Article 实体修改

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/blog/entity/ArticleRelated.java`
- Modify: `backend/src/main/java/com/sean/blog/module/blog/entity/Article.java:16`

**Interfaces:**
- Produces: `Article` 新增 `prerequisiteId` 字段（Long）
- Produces: `ArticleRelated` 实体（articleId, relatedArticleId + 5 个审计字段）

- [ ] **Step 1: 创建 ArticleRelated 实体**

```java
package com.sean.blog.module.blog.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class ArticleRelated {
    private Long id;
    private Long articleId;
    private Long relatedArticleId;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private Boolean isDeleted;
}
```

- [ ] **Step 2: Article.java 加 prerequisiteId 字段**

在 `Article.java` 的 `private Long categoryId;` 下面加一行：

```java
private Long prerequisiteId;
```

插入位置在 `categoryId` 和 `status` 之间。

- [ ] **Step 3: 编译验证**

```bash
cd backend && mvn clean compile
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/entity/
git commit -m "feat(blog): 新增 ArticleRelated 实体，Article 添加 prerequisiteId 字段

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 3: 后端 — ArticleRelatedMapper + ArticleMapper 扩展

**Files:**
- Create: `backend/src/main/java/com/sean/blog/module/blog/mapper/ArticleRelatedMapper.java`
- Create: `backend/src/main/resources/mapper/ArticleRelatedMapper.xml`
- Modify: `backend/src/main/java/com/sean/blog/module/blog/mapper/ArticleMapper.java`
- Modify: `backend/src/main/resources/mapper/ArticleMapper.xml`

**Interfaces:**
- Produces: `ArticleRelatedMapper` 接口，提供 `insertPair`、`softDeletePair`、`findRelatedArticleIds`、`findAllRelatedByArticleId`
- Produces: `ArticleMapper` 新增 `setPrerequisite`、`clearPrerequisite`、`findSummaryById`、`findSummaryByIds`、`findSummaryBySlug`

- [ ] **Step 1: 创建 ArticleRelatedMapper 接口**

```java
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
```

- [ ] **Step 2: 创建 ArticleRelatedMapper XML**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mapper PUBLIC "-//mybatis.org//DTD Mapper 3.0//EN"
        "http://mybatis.org/dtd/mybatis-3-mapper.dtd">
<mapper namespace="com.sean.blog.module.blog.mapper.ArticleRelatedMapper">

    <insert id="insert" useGeneratedKeys="true" keyProperty="id">
        INSERT INTO t_article_related (article_id, related_article_id, created_by, created_at, updated_by, updated_at)
        VALUES (#{articleId}, #{relatedArticleId}, #{createdBy}, NOW(), #{updatedBy}, NOW())
    </insert>

    <update id="softDeletePair">
        UPDATE t_article_related
        SET is_deleted = 1, updated_by = #{updatedBy}, updated_at = NOW()
        WHERE is_deleted = 0
          AND ((article_id = #{articleId} AND related_article_id = #{relatedArticleId})
            OR (article_id = #{relatedArticleId} AND related_article_id = #{articleId}))
    </update>

    <update id="softDeleteAllByArticleId">
        UPDATE t_article_related
        SET is_deleted = 1, updated_by = #{updatedBy}, updated_at = NOW()
        WHERE is_deleted = 0
          AND (article_id = #{articleId} OR related_article_id = #{articleId})
    </update>

    <select id="findRelatedArticleIds" resultType="long">
        SELECT related_article_id
        FROM t_article_related
        WHERE article_id = #{articleId} AND is_deleted = 0
    </select>

</mapper>
```

- [ ] **Step 3: ArticleMapper.java 新增方法**

在 `ArticleMapper` 接口中追加：

```java
int setPrerequisite(@Param("id") Long id, @Param("prerequisiteId") Long prerequisiteId);
int clearPrerequisite(@Param("id") Long id);
Article findSummaryBySlug(@Param("slug") String slug);
List<Article> findSummaryByIds(@Param("ids") List<Long> ids);
```

- [ ] **Step 4: ArticleMapper.xml 新增 SQL**

在 `ArticleMapper.xml` 中追加（`</mapper>` 之前）：

```xml
<update id="setPrerequisite">
    UPDATE t_article SET prerequisite_id = #{prerequisiteId}, updated_at = NOW()
    WHERE id = #{id}
</update>

<update id="clearPrerequisite">
    UPDATE t_article SET prerequisite_id = NULL, updated_at = NOW()
    WHERE id = #{id}
</update>

<select id="findSummaryBySlug" resultType="com.sean.blog.module.blog.entity.Article">
    SELECT a.id, a.title, a.slug, a.cover_image AS coverImage, a.excerpt,
           a.created_at AS createdAt,
           c.id AS `category.id`, c.name AS `category.name`, c.slug AS `category.slug`
    FROM t_article a
    LEFT JOIN t_category c ON a.category_id = c.id
    WHERE a.slug = #{slug} AND a.status = 'PUBLISHED'
</select>

<select id="findSummaryByIds" resultType="com.sean.blog.module.blog.entity.Article">
    SELECT a.id, a.title, a.slug, a.cover_image AS coverImage, a.excerpt,
           a.created_at AS createdAt,
           c.id AS `category.id`, c.name AS `category.name`, c.slug AS `category.slug`
    FROM t_article a
    LEFT JOIN t_category c ON a.category_id = c.id
    WHERE a.id IN
    <foreach item="id" collection="ids" open="(" separator="," close=")">
        #{id}
    </foreach>
    AND a.status = 'PUBLISHED'
    ORDER BY a.created_at DESC
</select>
```

- [ ] **Step 5: 编译验证**

```bash
cd backend && mvn clean compile
```

Expected: BUILD SUCCESS

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/mapper/ backend/src/main/resources/mapper/
git commit -m "feat(blog): ArticleRelatedMapper + ArticleMapper 扩展关联查询

新增 ArticleRelatedMapper 支持关联关系 CRUD（软删除），
ArticleMapper 新增 setPrerequisite/clearPrerequisite/findSummaryBySlug/findSummaryByIds。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 4: 后端 — ArticleService 关联管理逻辑

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java`

**Interfaces:**
- Consumes: `ArticleRelatedMapper`（DI 注入）
- Produces: `getPrerequisite(slug)` → `Article | null`
- Produces: `getRelated(slug)` → `List<Article>`
- Produces: `getRelations(id)` → `Map` 含 prerequisite 和 related
- Produces: `setPrerequisite(id, prerequisiteId)` → `void`
- Produces: `removePrerequisite(id)` → `void`
- Produces: `setRelated(id, relatedIds)` → `void`（全量替换，双向写入）

- [ ] **Step 1: 注入 ArticleRelatedMapper**

在 `ArticleService` 构造函数中添加 `ArticleRelatedMapper` 参数：

```java
private final ArticleRelatedMapper articleRelatedMapper;

public ArticleService(ArticleMapper articleMapper,
                      ArticleRelatedMapper articleRelatedMapper,
                      @Value("${file.upload.articles}") String articlesPath) {
    this.articleMapper = articleMapper;
    this.articleRelatedMapper = articleRelatedMapper;
    this.articlesPath = articlesPath;
    this.parser = Parser.builder().build();
    this.renderer = HtmlRenderer.builder().build();
}
```

- [ ] **Step 2: 添加公开接口方法**

在 `ArticleService` 类末尾追加：

```java
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
```

- [ ] **Step 3: 添加 Admin 管理方法**

在 `ArticleService` 类末尾继续追加：

```java
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
    articleMapper.clearPrerequisite(id);
}

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
```

- [ ] **Step 4: 编译验证**

```bash
cd backend && mvn clean compile
```

Expected: BUILD SUCCESS

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java
git commit -m "feat(blog): ArticleService 增加文章关联管理逻辑

getPrerequisite / getRelated / getRelations / setPrerequisite /
removePrerequisite / setRelated（全量替换，双向写入）。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 5: 后端 — Controller 层新增关联端点

**Files:**
- Modify: `backend/src/main/java/com/sean/blog/module/blog/controller/ArticlePublicController.java`
- Modify: `backend/src/main/java/com/sean/blog/module/blog/controller/ArticleAdminController.java`

**Interfaces:**
- Consumes: `ArticleService.getPrerequisite`、`getRelated`
- Produces（公开）: `GET /api/v1/articles/{slug}/prerequisite`、`GET /api/v1/articles/{slug}/related`
- Produces（Admin）: `GET /api/v1/admin/articles/{id}/related`、`PUT /api/v1/admin/articles/{id}/prerequisite`、`DELETE /api/v1/admin/articles/{id}/prerequisite`、`PUT /api/v1/admin/articles/{id}/related`

- [ ] **Step 1: ArticlePublicController 新增端点**

在 `ArticlePublicController` 末尾（类的 `}` 之前）追加：

```java
@GetMapping("/articles/{slug}/prerequisite")
public Result<Article> getPrerequisite(@PathVariable String slug) {
    Article prerequisite = articleService.getPrerequisite(slug);
    return Result.success(prerequisite);
}

@GetMapping("/articles/{slug}/related")
public Result<List<Article>> getRelated(@PathVariable String slug) {
    return Result.success(articleService.getRelated(slug));
}
```

- [ ] **Step 2: ArticleAdminController 新增端点**

在 `ArticleAdminController` 末尾追加：

```java
@GetMapping("/{id}/related")
public Result<Map<String, Object>> getRelations(@PathVariable Long id) {
    return Result.success(articleService.getRelations(id));
}

@PutMapping("/{id}/prerequisite")
public Result<?> setPrerequisite(@PathVariable Long id,
                                  @RequestBody Map<String, Long> body) {
    Long prerequisiteId = body.get("prerequisiteId");
    articleService.setPrerequisite(id, prerequisiteId);
    return Result.success();
}

@DeleteMapping("/{id}/prerequisite")
public Result<?> removePrerequisite(@PathVariable Long id) {
    articleService.removePrerequisite(id);
    return Result.success();
}

@PutMapping("/{id}/related")
public Result<?> setRelated(@PathVariable Long id,
                             @RequestBody Map<String, List<Long>> body) {
    List<Long> relatedIds = body.get("relatedIds");
    articleService.setRelated(id, relatedIds);
    return Result.success();
}
```

注意：`ArticleAdminController` 需要在文件顶部增加 `import java.util.Map;` 和 `import java.util.List;`。

- [ ] **Step 3: 编译验证**

```bash
cd backend && mvn clean compile
```

Expected: BUILD SUCCESS

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/sean/blog/module/blog/controller/
git commit -m "feat(blog): Controller 层新增文章关联端点

公开接口：{slug}/prerequisite, {slug}/related
Admin 接口：{id}/related GET/PUT, {id}/prerequisite PUT/DELETE

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 6: 前端 — 类型定义 + API 函数

**Files:**
- Modify: `frontend/src/types/index.ts`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: 后端关联 API 端点
- Produces: `ArticleSummary` 类型、`ArticleRelations` 类型、5 个新 API 函数

- [ ] **Step 1: types/index.ts 新增类型**

在 `Article` 接口定义之后追加：

```typescript
/** 精简文章摘要（用于关联文章展示，不含 contentMd/contentHtml/tags） */
export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  coverImage: string;
  excerpt: string;
  createdAt: string;
  category: Category | null;
}

/** 文章关联关系（Admin 编辑页初始化用） */
export interface ArticleRelations {
  prerequisite: { id: number; title: string } | null;
  related: { id: number; title: string }[];
}
```

- [ ] **Step 2: api.ts 新增 API 函数**

在 `api.ts` 的公开 API 区域（`getAdjacentArticles` 之后、`// 项目` 注释之前）追加：

```typescript
/** 获取前置文章 */
export async function getPrerequisiteArticle(
  slug: string,
): Promise<ArticleSummary | null> {
  return request<ArticleSummary | null>(
    publicUrl(`/articles/${slug}/prerequisite`),
  );
}

/** 获取相关文章 */
export async function getRelatedArticles(
  slug: string,
): Promise<ArticleSummary[]> {
  return request<ArticleSummary[]>(
    publicUrl(`/articles/${slug}/related`),
  );
}
```

在 `api.ts` 的 Admin API 区域（`adminDeleteArticle` 之后）追加：

```typescript
/** Admin: 查询文章关联关系 */
export async function adminGetArticleRelations(
  id: number,
): Promise<ArticleRelations> {
  return requestWithAuth<ArticleRelations>(adminUrl(`/articles/${id}/related`));
}

/** Admin: 设置前置文章 */
export async function adminSetPrerequisite(
  id: number,
  prerequisiteId: number | null,
): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/prerequisite`), {
    method: 'PUT',
    body: JSON.stringify({ prerequisiteId }),
  });
}

/** Admin: 移除前置文章 */
export async function adminRemovePrerequisite(id: number): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/prerequisite`), {
    method: 'DELETE',
  });
}

/** Admin: 全量替换相关文章 */
export async function adminSetRelated(
  id: number,
  relatedIds: number[],
): Promise<void> {
  await requestWithAuth<void>(adminUrl(`/articles/${id}/related`), {
    method: 'PUT',
    body: JSON.stringify({ relatedIds }),
  });
}
```

- [ ] **Step 3: 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 无新增类型错误。

- [ ] **Step 4: Commit**

```bash
git add frontend/src/types/index.ts frontend/src/lib/api.ts
git commit -m "feat(frontend): 添加文章关联类型定义和 API 函数

ArticleSummary / ArticleRelations 类型，公开 + Admin 关联 API 函数。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 7: 前端 — 文章详情页 PrerequisiteBanner + RelatedArticles 替换

**Files:**
- Modify: `frontend/src/app/blog/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getPrerequisiteArticle`、`getRelatedArticles`（替换 `getFeaturedArticles`）
- Produces: `PrerequisiteBanner` 组件、`RelatedArticles` 改造为支持展开/收起

- [ ] **Step 1: 更新 import**

将第 6 行的 import 修改为：

```typescript
import { getArticleBySlug, getAdjacentArticles, getPrerequisiteArticle, getRelatedArticles } from '@/lib/api';
import type { Article, ArticleSummary } from '@/types';
```

- [ ] **Step 2: 新增 PrerequisiteBanner 组件**

在 `PrevNextNav` 组件上方插入 `PrerequisiteBanner`：

```typescript
function PrerequisiteBanner({ article }: { article: ArticleSummary }) {
  return (
    <div className="mb-8 p-5 rounded-xl bg-secondary/5 border-l-4 border-secondary">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-lg flex-shrink-0 mt-0.5">📖</span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-semibold text-primary mb-1">
              建议先阅读：{article.title}
            </p>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              这篇文章基于上文，建议先阅读以更好理解
            </p>
          </div>
        </div>
        <Link
          href={`/blog/${article.slug}`}
          className="flex-shrink-0 inline-flex items-center gap-1 px-4 py-2 rounded bg-secondary text-white text-[13px] font-medium hover:opacity-90 transition-opacity"
        >
          去阅读
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 改造 RelatedArticles 组件**

替换现有 `RelatedArticles` 为支持展开/收起的版本：

```typescript
function RelatedArticles({ articles }: { articles: ArticleSummary[] }) {
  const [showAll, setShowAll] = useState(false);

  if (articles.length === 0) return null;

  const displayed = showAll ? articles : articles.slice(0, 3);
  const hasMore = articles.length > 3;

  return (
    <section className="mt-24 bg-surface-container-low py-20 border-t border-outline-variant">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <h2 className="font-display text-[28px] sm:text-[32px] font-bold text-primary mb-12">
          相关文章
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {displayed.map((article) => (
            <Link
              key={article.id}
              href={`/blog/${article.slug}`}
              className="group block"
            >
              {article.coverImage && (
                <div className="aspect-video rounded-lg overflow-hidden border border-outline-variant mb-4">
                  <img
                    src={article.coverImage}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 mb-2">
                {article.category && (
                  <>
                    <span className="font-display text-[12px] tracking-[0.05em] font-semibold text-secondary uppercase">
                      {article.category.name}
                    </span>
                    <span className="text-outline-variant">·</span>
                  </>
                )}
                <span className="font-display text-[12px] tracking-[0.05em] font-semibold text-on-surface-variant">
                  {formatDate(article.createdAt)}
                </span>
              </div>

              <h3 className="font-display text-[15px] font-medium text-primary group-hover:text-secondary transition-colors mb-2 line-clamp-2">
                {article.title}
              </h3>

              {article.excerpt && (
                <p className="text-[14px] leading-[20px] text-on-surface-variant line-clamp-2">
                  {article.excerpt}
                </p>
              )}
            </Link>
          ))}
        </div>

        {hasMore && (
          <div className="mt-10 text-center">
            <button
              onClick={() => setShowAll(!showAll)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded border border-outline-variant text-[14px] font-medium text-primary hover:bg-surface-container transition-colors"
            >
              {showAll ? '收起' : `查看更多（+${articles.length - 3}）`}
              <svg
                className={`w-4 h-4 transition-transform ${showAll ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 修改主组件的 state 和 useEffect**

将 state 声明改为：

```typescript
const [prerequisite, setPrerequisite] = useState<ArticleSummary | null>(null);
const [relatedArticles, setRelatedArticles] = useState<ArticleSummary[]>([]);
```

将 useEffect 中的 related 获取替换为：

```typescript
// Fetch prerequisite article
getPrerequisiteArticle(slug)
  .then((article) => {
    setPrerequisite(article);
  })
  .catch(() => {
    // Non-critical; silently ignore
  });

// Fetch related articles
getRelatedArticles(slug)
  .then((articles) => {
    setRelatedArticles(articles);
  })
  .catch(() => {
    // Non-critical; silently ignore
  });
```

- [ ] **Step 5: 在 JSX 中插入 PrerequisiteBanner**

在 `<h1>` 标题之后、Metadata 行之前插入：

```tsx
{/* Prerequisite banner */}
{prerequisite && <PrerequisiteBanner article={prerequisite} />}
```

- [ ] **Step 6: 类型检查 + 构建验证**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 无类型错误。

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/blog/\[slug\]/page.tsx
git commit -m "feat(frontend): 文章详情页增加前置文章提示 + 真实关联文章

PrerequisiteBanner 在标题下方展示前置阅读建议，
RelatedArticles 替换为后端真实关联数据，超 3 篇支持展开/收起。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 8: 前端 — TableOfContents 侧边栏前置标签

**Files:**
- Modify: `frontend/src/components/blog/TableOfContents.tsx`
- Modify: `frontend/src/app/blog/[slug]/page.tsx`（侧边栏区域）

**Interfaces:**
- Consumes: `prerequisite: ArticleSummary | null` prop
- Produces: TOC 下方显示前置文章小标签

- [ ] **Step 1: TableOfContents 接收 prerequisite prop**

修改 `TableOfContents` 组件，增加可选 `prerequisite` prop。在组件文件顶部找到 props 接口定义（如果有），或者在组件函数签名处修改。

当前 `TableOfContents` 组件的 props 只有 `content: string`。修改为：

```typescript
// 文件：frontend/src/components/blog/TableOfContents.tsx

import type { ArticleSummary } from '@/types';
import Link from 'next/link';

// 修改组件签名，增加 prerequisite 参数
export default function TableOfContents({
  content,
  prerequisite,
}: {
  content: string;
  prerequisite?: ArticleSummary | null;
}) {
  // ... 现有逻辑保持不变 ...
```

- [ ] **Step 2: 在 TOC 渲染底部加入前置标签**

在 `TableOfContents` 组件的 return JSX 中，TOC 列表下方追加：

```tsx
{/* Prerequisite badge */}
{prerequisite && (
  <div className="mt-6 pt-4 border-t border-outline-variant/60">
    <p className="font-display text-[11px] tracking-[0.05em] font-semibold text-on-surface-variant/60 uppercase mb-2">
      前置阅读
    </p>
    <Link
      href={`/blog/${prerequisite.slug}`}
      className="flex items-center gap-2 text-[13px] text-secondary hover:text-secondary/80 transition-colors group"
    >
      <span className="flex-shrink-0">📖</span>
      <span className="group-hover:underline line-clamp-1">
        {prerequisite.title}
      </span>
    </Link>
  </div>
)}
```

- [ ] **Step 3: 在 page.tsx 的侧边栏中传递 prerequisite**

在 page.tsx 的 `<aside>` 区域，将 `<TableOfContents content={article.contentMd || ''} />` 修改为：

```tsx
<TableOfContents
  content={article.contentMd || ''}
  prerequisite={prerequisite}
/>
```

- [ ] **Step 4: 类型检查**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 无类型错误。

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/blog/TableOfContents.tsx frontend/src/app/blog/\[slug\]/page.tsx
git commit -m "feat(frontend): TOC 侧边栏增加前置文章标签

TableOfContents 接收 optional prerequisite prop，
在目录底部显示前置阅读链接。

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

### Task 9: 集成验证

**Files:**
- 无新建文件

- [ ] **Step 1: 重启 Docker 服务**

```bash
docker compose up -d --build
```

Expected: 所有容器 running

- [ ] **Step 2: 验证数据库迁移**

```bash
docker compose exec mysql mysql -u root -p blog \
  -e "SELECT COLUMN_NAME, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='t_article' AND COLUMN_NAME='prerequisite_id';"

docker compose exec mysql mysql -u root -p blog \
  -e "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='t_article_related';"
```

Expected: prerequisite_id 列存在，t_article_related 表有 id, article_id, related_article_id, created_by, created_at, updated_by, updated_at, is_deleted

- [ ] **Step 3: 验证公开 API**

```bash
# 前置文章（没有设置时返回 null）
curl -s http://localhost/api/v1/articles/<existing-slug>/prerequisite | python3 -m json.tool

# 相关文章（没有设置时返回 []）
curl -s http://localhost/api/v1/articles/<existing-slug>/related | python3 -m json.tool
```

Expected: 返回格式正确，`data` 为 null 或 []。

- [ ] **Step 4: 验证 Admin API**

```bash
# 登录获取 token
TOKEN=$(curl -s http://localhost/api/v1/admin/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['token'])")

# 查看文章 1 的关联关系
curl -s http://localhost/api/v1/admin/articles/1/related \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# 设置文章 2 的前置文章为文章 1
curl -s -X PUT http://localhost/api/v1/admin/articles/2/prerequisite \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"prerequisiteId":1}' | python3 -m json.tool

# 设置文章 2 的相关文章为文章 1 和文章 3
curl -s -X PUT http://localhost/api/v1/admin/articles/2/related \
  -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"relatedIds":[1,3]}' | python3 -m json.tool

# 验证相关文章双向写入
curl -s http://localhost/api/v1/admin/articles/1/related \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
# Expected: article 1 的 related 中应包含 article 2
```

- [ ] **Step 5: 验证前端页面**

在浏览器中访问：
- `http://localhost/blog/<slug>` — 确认前置文章提示卡片 + 侧边栏标签 + 相关文章列表正常
- 确认没有前置文章时不显示相关 UI
- 确认相关文章超过 3 篇时「查看更多」按钮正常

- [ ] **Step 6: Commit（如有修复）**

```bash
git add -A
git commit -m "chore: 集成验证后的修复

Co-Authored-By: Claude <noreply@anthropic.com>"
```
