# Article Search API Design

> **Iteration:** 1 -- Article Search Feature
> **Date:** 2026-07-08
> **Version:** v1

---

## 1. Endpoint

```
GET /api/v1/articles/search
```

- **Authentication:** Not required (public endpoint)
- **Method:** GET
- **Content-Type:** application/json (response)

---

## 2. Request Parameters

| Parameter | Type | Required | Default | Max | Description |
|-----------|------|----------|---------|-----|-------------|
| `keyword` | string | No* | - | 200 chars | Search keyword matched against article title (fuzzy/LIKE) |
| `tagNames` | string | No* | - | 500 chars | Comma-separated tag names, e.g. `"React,Spring Boot"` |
| `page` | integer | No | `1` | - | Page number (1-based) |
| `pageSize` | integer | No | `10` | `50` | Number of results per page |

> *At least one of `keyword` or `tagNames` is required. If both are empty, the API returns `400`.

### 2.1 Parameter Semantics

- **`keyword`**: Case-insensitive fuzzy match on `t_article.title`. Uses MySQL `LIKE CONCAT('%', ?, '%')` (or FULLTEXT MATCH if available). Whitespace is trimmed. Empty string is treated as not provided.

- **`tagNames`**: Comma-separated list of tag names. Articles matching **any** of the provided tags are returned (OR logic among tags). Tag name matching is case-sensitive (matches `t_tag.name` exactly). Whitespace around commas is trimmed. Empty tag names in the list are ignored. Duplicate tag names are deduplicated server-side.

- **Combined search**: When both `keyword` and `tagNames` are provided, results match articles whose title matches the keyword **AND** that have at least one of the specified tags (AND logic between keyword and tags; OR logic among tags).

- **`page`** and **`pageSize`**: Standard pagination. `pageSize` is capped at 50 to prevent excessive data retrieval.

### 2.2 Example Requests

```bash
# Search by title keyword
GET /api/v1/articles/search?keyword=Spring

# Search by single tag
GET /api/v1/articles/search?tagNames=React

# Search by multiple tags (OR logic)
GET /api/v1/articles/search?tagNames=React,Spring%20Boot

# Combined search (AND logic: title matches "Docker" AND has tag "DevOps" or "Cloud")
GET /api/v1/articles/search?keyword=Docker&tagNames=DevOps,Cloud

# Paginated search
GET /api/v1/articles/search?keyword=AI&page=2&pageSize=20

# Empty search (error)
GET /api/v1/articles/search
# → 400: "At least one of keyword or tagNames is required"
```

---

## 3. Response Format

### 3.1 Success Response (200)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [
      {
        "id": 1,
        "title": "Building AI Agents with Spring Boot",
        "slug": "building-ai-agents-with-spring-boot-1700000000000",
        "excerpt": "A deep dive into AI agent architecture using Spring Boot...",
        "coverImage": "/images/articles/ai-agents.png",
        "categoryId": 2,
        "status": "PUBLISHED",
        "isFeatured": true,
        "viewCount": 42,
        "createdAt": "2026-07-01T10:00:00",
        "updatedAt": "2026-07-01T10:00:00",
        "category": {
          "id": 2,
          "name": "Backend",
          "slug": "backend"
        },
        "tags": [
          {
            "id": 3,
            "name": "Spring Boot",
            "slug": "spring-boot"
          },
          {
            "id": 5,
            "name": "AI",
            "slug": "ai"
          }
        ]
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3.2 Field Descriptions

#### Article object (`records[]`)

| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `id` | number | No | Article unique ID |
| `title` | string | No | Article title (max 200 chars) |
| `slug` | string | No | URL-friendly identifier (`{title-slug}-{timestamp}`) |
| `excerpt` | string | Yes | First ~200 chars of article body |
| `coverImage` | string | Yes | Cover image URL path |
| `categoryId` | number | Yes | Category foreign key |
| `status` | string | No | Always `"PUBLISHED"` in search results |
| `isFeatured` | boolean | No | Whether marked as featured |
| `viewCount` | number | No | Total view count |
| `createdAt` | string | No | ISO 8601 datetime |
| `updatedAt` | string | No | ISO 8601 datetime |
| `category` | object | Yes | Joined category (id, name, slug) |
| `tags` | array | No | Joined tags (id, name, slug each) |

#### PageResult wrapper (`data`)

| Field | Type | Description |
|-------|------|-------------|
| `records` | Article[] | Array of article objects for current page |
| `total` | number | Total number of matching articles |
| `page` | number | Current page number |
| `pageSize` | number | Items per page |

### 3.3 Error Responses

#### Empty Search (400)

```json
{
  "code": 400,
  "message": "At least one of keyword or tagNames is required",
  "data": null
}
```

#### Unauthorized (401) -- only if accidentally hitting admin endpoint

```json
{
  "code": 401,
  "message": "Authentication required",
  "data": null
}
```

#### Server Error (500)

```json
{
  "code": 500,
  "message": "Internal server error",
  "data": null
}
```

### 3.4 Zero Results (200 -- success with empty records)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [],
    "total": 0,
    "page": 1,
    "pageSize": 10
  }
}
```

Zero results is NOT an error condition. The frontend displays an empty state message ("No articles match your search criteria") rather than treating it as a failure.

---

## 4. SQL Implementation

### 4.1 Mapper Query (MyBatis XML)

```xml
<select id="searchPublished" resultMap="articleDetail">
    SELECT DISTINCT a.id, a.title, a.slug, a.excerpt, a.cover_image,
           a.category_id, a.status, a.is_featured, a.view_count,
           a.created_at, a.updated_at,
           c.id as cat_id, c.name as cat_name, c.slug as cat_slug,
           t.id as tag_id, t.name as tag_name, t.slug as tag_slug
    FROM t_article a
    LEFT JOIN t_category c ON a.category_id = c.id AND c.is_deleted = 0
    LEFT JOIN t_article_tag at ON a.id = at.article_id
    LEFT JOIN t_tag t ON at.tag_id = t.id AND t.is_deleted = 0
    <where>
        a.status = 'PUBLISHED'
        AND a.is_deleted = 0
        <if test="keyword != null and keyword != ''">
            AND a.title LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="tagNames != null and tagNames.size() > 0">
            AND a.id IN (
                SELECT DISTINCT at2.article_id
                FROM t_article_tag at2
                JOIN t_tag t2 ON at2.tag_id = t2.id
                WHERE t2.name IN
                <foreach collection="tagNames" item="tagName" open="(" separator="," close=")">
                    #{tagName}
                </foreach>
                AND t2.is_deleted = 0
            )
        </if>
    </where>
    ORDER BY a.created_at DESC
    LIMIT #{offset}, #{pageSize}
</select>
```

### 4.2 Count Query

```xml
<select id="countSearchPublished" resultType="long">
    SELECT COUNT(DISTINCT a.id)
    FROM t_article a
    LEFT JOIN t_article_tag at ON a.id = at.article_id
    LEFT JOIN t_tag t ON at.tag_id = t.id AND t.is_deleted = 0
    <where>
        a.status = 'PUBLISHED'
        AND a.is_deleted = 0
        <if test="keyword != null and keyword != ''">
            AND a.title LIKE CONCAT('%', #{keyword}, '%')
        </if>
        <if test="tagNames != null and tagNames.size() > 0">
            AND a.id IN (
                SELECT DISTINCT at2.article_id
                FROM t_article_tag at2
                JOIN t_tag t2 ON at2.tag_id = t2.id
                WHERE t2.name IN
                <foreach collection="tagNames" item="tagName" open="(" separator="," close=")">
                    #{tagName}
                </foreach>
                AND t2.is_deleted = 0
            )
        </if>
    </where>
</select>
```

### 4.3 Indexes Required

```sql
-- For title LIKE search (B-tree only helps with prefix matching, but still useful for sorting)
CREATE INDEX idx_article_title ON t_article(title);

-- For soft-delete filtering on all joined tables
CREATE INDEX idx_article_is_deleted ON t_article(is_deleted);
CREATE INDEX idx_tag_is_deleted ON t_tag(is_deleted);

-- Composite index for the most common query filter
CREATE INDEX idx_article_status_deleted ON t_article(status, is_deleted);

-- For tag name lookup in subquery
CREATE INDEX idx_tag_name ON t_tag(name);
```

**Note on FULLTEXT:** For datasets under ~10,000 articles, `LIKE '%keyword%'` with B-tree indexes is acceptable. For larger datasets or Chinese text search, consider upgrading to MySQL FULLTEXT index with ngram parser:

```sql
ALTER TABLE t_article ADD FULLTEXT INDEX ft_article_title (title) WITH PARSER ngram;
```

With the corresponding query change:
```sql
AND MATCH(a.title) AGAINST(#{keyword} IN NATURAL LANGUAGE MODE)
```

### 4.4 Soft Delete Compliance

Per sean-dev-standards section 1.2, every table involved in the query must filter `is_deleted = 0`:
- `t_article.is_deleted = 0` (direct WHERE clause)
- `t_category.is_deleted = 0` (LEFT JOIN condition)
- `t_tag.is_deleted = 0` (LEFT JOIN condition + subquery)
- `t_article_tag` does not have `is_deleted` in current schema but should be added

---

## 5. Security Considerations

| Concern | Mitigation |
|---------|-----------|
| SQL injection via `keyword` | Parameterized query (`#{keyword}`), MyBatis prevents injection |
| SQL injection via `tagNames` | Parameterized query (`#{tagName}` in foreach), MyBatis prevents injection |
| DoS via large `pageSize` | Capped at 50 via `@Max(50)` validation |
| DoS via long `keyword` | Truncated/validated at application layer (max 200 chars) |
| Information disclosure | Only PUBLISHED articles returned; soft-deleted articles excluded |
| No authentication required | Intentional -- search is a public feature |

---

## 6. Performance Considerations

| Aspect | Approach | Expected Performance |
|--------|----------|---------------------|
| Title search | `LIKE '%keyword%'` | Acceptable for <10K articles with index on title |
| Tag filtering | Subquery with `IN` on indexed `t_tag.name` | Fast for typical tag counts (<100 tags) |
| Combined search | Both conditions evaluated in single query | Two indexes used, MySQL optimizer chooses execution plan |
| Pagination | `LIMIT #{offset}, #{pageSize}` | Standard; consider keyset pagination for very large datasets |
| DISTINCT overhead | Required for tag JOIN deduplication | Acceptable for small-moderate datasets |
| JOIN depth | Max 3 JOIN levels (category, article_tag, tag) | Normal for relational data |

---

## 7. Distinction from Existing List Endpoint

| Aspect | `GET /api/v1/articles` | `GET /api/v1/articles/search` |
|--------|------------------------|-------------------------------|
| Purpose | Browse/filter articles | Dedicated search |
| Tag parameter | `tag` (single tag ID) | `tagNames` (multiple tag names) |
| Category filter | `category` (category ID) | Not supported (use list endpoint) |
| Keyword | Optional secondary filter | Primary search mode |
| Empty params | Returns all published articles | Returns 400 error |
| Sort | `sort=latest` param | Always `created_at DESC` |
| Response format | Same PageResult wrapper | Same PageResult wrapper |
| Use case | "Show me all React articles" | "Find articles about Docker" |
