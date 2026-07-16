# 文章关联功能 — 系统设计文档

> 版本: v1.0 | 日期: 2026-07-17

---

## 1. 概述

为博客文章增加两种关联关系：**前置文章**（单向，B 基于 A，建议先读 A）和**相关文章**（双向对等，A 关联 B 则 B 自动关联 A）。

### 1.1 需求决策

| 维度 | 决策 |
|------|------|
| 关系类型 | 前置文章（单向）+ 相关文章（双向对等） |
| 配置方式 | Admin 后台手动选择 |
| 前置数量 | 每篇最多 1 篇 |
| 前置展示 | 文章顶部提示卡片 + TOC 侧边栏标签 |
| 相关数量 | 不限制，超 3 篇可滚动/查看更多 |
| 公开 API | 独立接口，不从文章详情返回 |

---

## 2. 数据库设计

### 2.1 t_article 新增字段

```sql
ALTER TABLE t_article
  ADD COLUMN prerequisite_id BIGINT DEFAULT NULL COMMENT '前置文章ID，建议先阅读' AFTER category_id,
  ADD INDEX idx_prerequisite_id (prerequisite_id),
  ADD FOREIGN KEY (prerequisite_id) REFERENCES t_article(id) ON DELETE SET NULL;
```

### 2.2 新建 t_article_related 表

```sql
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

### 2.3 设计要点

- 遵循 `sean-dev-standards` 审计字段规范：`created_by`、`created_at`、`updated_by`、`updated_at`、`is_deleted`
- 所有删除为软删除，查询带上 `is_deleted = 0`
- 相关文章插入时双向写入 `(A, B)` 和 `(B, A)`，删除时双向软删除
- `prerequisite_id` 是自引用外键，删除前置文章时自动置 NULL

---

## 3. API 设计

### 3.1 公开接口

```
GET /api/v1/articles/{slug}/prerequisite
  → 返回前置文章（精简对象），无前置时返回 null
  → 响应：{ "code": 200, "data": { id, title, slug, coverImage, excerpt, category } | null }

GET /api/v1/articles/{slug}/related
  → 返回相关文章列表（精简对象数组）
  → 响应：{ "code": 200, "data": [{ id, title, slug, coverImage, excerpt, category, createdAt }] }
```

### 3.2 Admin 接口

```
GET    /api/v1/admin/articles/{id}/related
  → 查询文章的所有关联关系（前置 + 相关，供编辑页初始化）
  → 响应：{ prerequisite: { id, title } | null, related: [{ id, title }] }

PUT    /api/v1/admin/articles/{id}/prerequisite
  → 设置前置文章
  → body: { prerequisiteId: number | null }

DELETE /api/v1/admin/articles/{id}/prerequisite
  → 移除前置文章

PUT    /api/v1/admin/articles/{id}/related
  → 全量替换相关文章列表
  → body: { relatedIds: number[] }
```

### 3.3 设计要点

- 公开接口返回精简 Article 对象（仅展示所需字段，不含 contentMd/contentHtml/tags）
- Admin 列表类接口返回 `{ id, title }` 用于下拉选择器
- `PUT /related` 全量替换：内部自动双向写入新关系 + 清理旧关系
- 遵循 RESTful，遵循现有 `/api/v1/` + `/api/v1/admin/` 路径规范

---

## 4. 前端设计

### 4.1 文章详情页改动（`frontend/src/app/blog/[slug]/page.tsx`）

**PrerequisiteBanner（新增，顶部）**

位于文章标题下方、Metadata 行上方。前置文章存在时显示：

```
┌──────────────────────────────────────────────────┐
│ 📖 建议先阅读：{prerequisite.title}                │
│    这篇文章基于上文，建议先阅读以更好理解            │
│                                        [去阅读 →] │
└──────────────────────────────────────────────────┘
```

- 绿色左边框（`border-l-4 border-secondary`）+ 浅绿背景（`bg-secondary/5`）
- 点击卡片或按钮跳转到前置文章
- 前置文章不存在时不渲染

**TOC 侧边栏前置标签（新增）**

在 TableOfContents 组件下方显示小标签行：

```
│  前置阅读                                      │
│  📖 {prerequisite.title}                       │
```

- 紧凑样式，点击跳转
- 前置文章不存在时不渲染

**RelatedArticles 区域（替换现有实现）**

- **现有行为**：用 `getFeaturedArticles(6)` 过滤当前文章后取前 3 篇展示
- **新行为**：改用 `GET /api/v1/articles/{slug}/related` 获取真实关联
- 前端展示逻辑：默认展示前 3 篇，超过 3 篇时显示「查看更多（+N）」按钮，点击展开全部
- 卡片样式复用现有 `RelatedArticles` 子组件的设计

**数据获取流程**：

```
useEffect → 并行请求:
  ├─ getArticleBySlug(slug)           → article (控制 loading/error)
  ├─ getPrerequisiteArticle(slug)     → prerequisite
  ├─ getRelatedArticles(slug)         → relatedArticles
  └─ getAdjacentArticles(slug)        → prevArticle / nextArticle
```

### 4.2 Admin 编辑页新增区域

在现有 Admin 文章创建/编辑页增加「文章关联」配置区域：

- **前置文章选择器**：搜索式下拉框，从已有已发布文章列表中选择，支持清空
- **相关文章选择器**：搜索式多选下拉框，支持添加/移除
- 编辑页初始化时通过 `GET /api/v1/admin/articles/{id}/related` 获取当前关联状态

### 4.3 新增 API 函数（`frontend/src/lib/api.ts`）

```typescript
// 公开接口
getPrerequisiteArticle(slug: string): Promise<Article | null>
getRelatedArticles(slug: string): Promise<Article[]>

// Admin 接口
adminGetArticleRelations(id: number): Promise<{ prerequisite: Article | null; related: Article[] }>
adminSetPrerequisite(id: number, prerequisiteId: number | null): Promise<void>
adminRemovePrerequisite(id: number): Promise<void>
adminSetRelated(id: number, relatedIds: number[]): Promise<void>
```

### 4.4 类型定义（`frontend/src/types/index.ts`）

```typescript
// 新增：精简文章摘要类型（用于关联展示）
export interface ArticleSummary {
  id: number;
  title: string;
  slug: string;
  coverImage: string;
  excerpt: string;
  createdAt: string;
  category: Category | null;
}
```

```typescript
// 新增：文章关联关系类型
export interface ArticleRelations {
  prerequisite: ArticleSummary | null;
  related: ArticleSummary[];
}
```

### 4.5 设计要点

- 公开接口均不需登录认证，但不暴露 `contentMd`/`contentHtml` 等大字段
- 加载/空/错误状态：PrerequisiteBanner 和侧边栏标签不存在时不渲染（不展示 loading/error 态），RelatedArticles 沿用现有 loading/error/empty 处理模式
- 遵循现有设计规范：Navy `#002045` + Green `#0a6c44`，8px 间距体系，卡片边框 `1px solid #E2E8F0`

---

## 5. 后端实现范围

### 5.1 新建文件

| 文件 | 说明 |
|------|------|
| `entity/ArticleRelated.java` | t_article_related 实体类 |
| `mapper/ArticleRelatedMapper.java` | MyBatis 映射接口 |
| `resources/mapper/ArticleRelatedMapper.xml` | MyBatis SQL 映射 |
| `db/migration/V3__article_related.sql` | 数据库迁移脚本 |

### 5.2 修改文件

| 文件 | 改动 |
|------|------|
| `entity/Article.java` | 新增 `prerequisiteId` 字段 |
| `mapper/ArticleMapper.java` | 新增 `setPrerequisite`、`clearPrerequisite`、`findSummaryBySlug` 等方法 |
| `mapper/ArticleMapper.xml` | 新增对应 SQL |
| `controller/ArticlePublicController.java` | 新增 `GET {slug}/prerequisite`、`GET {slug}/related` |
| `controller/ArticleAdminController.java` | 新增关联管理端点 |
| `service/ArticleService.java` | 新增关联管理业务逻辑 |

### 5.3 后端逻辑要点

- `PUT /admin/articles/{id}/related`：全量替换，先查询关联关系 → 对比差集 → 删除已移除的关系（软删除） + 插入新关系（双向写入）
- 查询相关文章时，联表查出状态为 PUBLISHED 且 `is_deleted = 0` 的文章
- 管理端的 `created_by` / `updated_by` 从 JWT token 中获取当前用户名

---

## 6. 迁移脚本

```sql
-- V3: 文章关联功能

-- 6.1 t_article 添加前置文章字段
ALTER TABLE t_article
  ADD COLUMN prerequisite_id BIGINT DEFAULT NULL COMMENT '前置文章ID，建议先阅读' AFTER category_id,
  ADD INDEX idx_prerequisite_id (prerequisite_id),
  ADD FOREIGN KEY (prerequisite_id) REFERENCES t_article(id) ON DELETE SET NULL;

-- 6.2 创建 t_article_related 表
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
