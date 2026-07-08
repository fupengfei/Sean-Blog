# Article Search API Design

> Feature: Search articles by title and tags
> Version: v1.0
> Date: 2026-07-08
> Project: Sean's AI World Blog (Sean-Blog)

---

## 1. API Endpoint

### `GET /api/v1/articles` (Public, No Auth Required)

The existing article list endpoint is extended. No new endpoint is needed.

**Base URL:** `http://<host>:8080/api/v1/articles`

---

## 2. Request

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `keyword` | string | No | -- | Search term matched against article title, excerpt, and tag names |
| `category` | integer | No | -- | Filter by category ID |
| `tag` | integer | No | -- | Filter by specific tag ID |
| `page` | integer | No | `1` | Page number (1-based) |
| `size` | integer | No | `10` | Page size (items per page) |
| `sort` | string | No | `latest` | Sort order (reserved for future use) |

### Example Requests

```
# Basic keyword search
GET /api/v1/articles?keyword=react

# Combined: search within a category
GET /api/v1/articles?keyword=docker&category=2

# Combined: keyword + tag filter (both must match)
GET /api/v1/articles?keyword=spring&tag=5

# Pagination with search
GET /api/v1/articles?keyword=ai&page=1&size=20

# No keyword (backward compatible -- returns all published)
GET /api/v1/articles?page=1&size=10
```

---

## 3. Response

### Success Response (200 OK)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "Building React Components from Scratch",
        "slug": "building-react-components-from-scratch-1720456789000",
        "contentMd": "# Building React Components...\n\n...",
        "contentHtml": "<h1>Building React Components...</h1>...",
        "excerpt": "A comprehensive guide to building reusable React components with TypeScript...",
        "coverImage": "/api/v1/files/images/abc123_cover.png",
        "categoryId": 1,
        "status": "PUBLISHED",
        "isFeatured": true,
        "viewCount": 142,
        "createdAt": "2026-07-01T10:00:00",
        "updatedAt": "2026-07-05T14:30:00",
        "category": {
          "id": 1,
          "name": "Frontend",
          "slug": "frontend"
        },
        "tags": [
          { "id": 1, "name": "React", "slug": "react" },
          { "id": 3, "name": "TypeScript", "slug": "typescript" }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  }
}
```

### Empty Results Response (200 OK)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [],
    "total": 0,
    "page": 1,
    "size": 10
  }
}
```

---

## 4. Search Logic

### 4.1 Matching Rules

The keyword is matched using **OR** logic across three scopes:

| Scope | Field(s) | Match Type |
|-------|----------|------------|
| Title | `t_article.title` | SQL `LIKE '%keyword%'` |
| Excerpt | `t_article.excerpt` | SQL `LIKE '%keyword%'` |
| Tag Name | `t_tag.name` | SQL `LIKE '%keyword%'` via subquery |

An article matches if the keyword appears in **any** of these three scopes.

### 4.2 SQL Implementation

```sql
SELECT DISTINCT a.*, c.id as cat_id, c.name as cat_name, c.slug as cat_slug
FROM t_article a
LEFT JOIN t_category c ON a.category_id = c.id
WHERE a.status = 'PUBLISHED'
  AND (
      a.title LIKE CONCAT('%', #{keyword}, '%')
      OR a.excerpt LIKE CONCAT('%', #{keyword}, '%')
      OR a.id IN (
          SELECT at2.article_id FROM t_article_tag at2
          JOIN t_tag t2 ON at2.tag_id = t2.id
          WHERE t2.name LIKE CONCAT('%', #{keyword}, '%')
      )
  )
ORDER BY a.created_at DESC
LIMIT #{offset}, #{size}
```

### 4.3 Combination with Other Filters

All filter conditions are combined with **AND**:

```
keyword matches (title OR excerpt OR tag)
  AND category matches (if category param provided)
  AND tag matches (if tag param provided)
  AND status = 'PUBLISHED'
```

Example: `?keyword=react&category=1` returns articles that match "react" AND belong to category 1.

---

## 5. Admin Endpoint

### `GET /api/v1/admin/articles` (Requires JWT)

The same keyword search logic applies to the admin article list for consistency. The admin endpoint additionally includes articles with status `DRAFT` and `DELETED`.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | No | Same search behavior (title + excerpt + tags) |
| `page` | integer | No | Page number |
| `size` | integer | No | Page size |

---

## 6. Edge Cases

| Scenario | Behavior |
|----------|----------|
| `keyword` omitted or empty string | Parameter not included in SQL WHERE; returns all published articles |
| `keyword` is whitespace only | Frontend trims before sending; empty after trim means param is omitted |
| `keyword` contains SQL special chars (`%`, `_`) | MySQL LIKE treats `%` and `_` as wildcards; acceptable for search UX. Parameter binding prevents SQL injection. |
| `keyword` is 1 character | Allowed; will match broadly (acceptable for small datasets) |
| No results found | Returns `list: []` with `total: 0`; frontend shows empty state message |
| Keyword in Chinese | Supported via `utf8mb4` charset on all tables |
| Tag name matches but article title/excerpt does not | Article included (this is the new behavior being added) |

---

## 7. Performance Considerations

- **Dataset size**: Personal blog with tens to low hundreds of articles
- **LIKE '%keyword%'** cannot use standard B-tree indexes, but is acceptable at this scale
- **Subquery for tag matching** uses indexed columns (`t_article_tag.article_id`, `t_tag.id`)
- **Full-text search** (MySQL FULLTEXT or Elasticsearch) is explicitly out of v1 scope per the design document

---

## 8. Backward Compatibility

This change is **fully backward compatible**:

- The `keyword` parameter already exists in the published API spec
- Omitting `keyword` produces the same result as before (all published articles)
- The only change is additional results when a keyword matches tag names that previously would not have been returned
- The response structure is unchanged
