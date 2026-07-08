# Iteration 1: Article Search Feature -- Implementation Plan

> Feature: Article search supporting title and tag search
> Date: 2026-07-08
> Project: Sean's AI World Blog (Sean-Blog)

---

## 1. Overview

### 1.1 Goal

Add a search capability to the public blog article list that allows users to find articles by searching across **titles** and **tags**. The search will match a keyword against both the article's title/excerpt and the names of tags associated with the article.

### 1.2 Scope

| In scope | Out of scope |
|----------|--------------|
| Keyword search across title + excerpt | Full-text search (Elasticsearch) |
| Keyword search across tag names | Search within article body |
| Frontend search bar on blog list page | Search result highlighting |
| Backend API extension | Search history / autocomplete |
| Admin article list search consistency | Advanced filters (date range, etc.) |

### 1.3 Current State

The existing design (Task 7, ArticleMapper.xml) already supports a `keyword` parameter that searches title and excerpt:

```sql
AND (a.title LIKE CONCAT('%', #{keyword}, '%') OR a.excerpt LIKE CONCAT('%', #{keyword}, '%'))
```

However, tag names are **not** included in the search scope. A user searching for "React" would find articles with "React" in the title or excerpt, but would miss articles tagged "React" whose titles/excerpts do not contain the word.

---

## 2. API Design

### 2.1 Extended Endpoint: `GET /api/v1/articles`

The existing endpoint already accepts a `keyword` query parameter. We extend the backend query logic to also match against tag names.

**Request:**

```
GET /api/v1/articles?keyword=react&page=1&size=10
```

**Query parameters (unchanged from existing design):**

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `keyword` | string | No | Search term matched against title, excerpt, AND tag names |
| `category` | long | No | Filter by category ID |
| `tag` | long | No | Filter by specific tag ID (existing behavior preserved) |
| `page` | int | No | Page number (default 1) |
| `size` | int | No | Page size (default 10) |
| `sort` | string | No | Sort order (latest, etc.) |

**Response:** (unchanged)

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "list": [
      {
        "id": 1,
        "title": "Building React Components",
        "slug": "building-react-components-1234567890",
        "excerpt": "A guide to building reusable React components...",
        "coverImage": null,
        "categoryId": 1,
        "status": "PUBLISHED",
        "isFeatured": true,
        "viewCount": 42,
        "createdAt": "2026-07-01T10:00:00",
        "updatedAt": "2026-07-01T10:00:00",
        "category": { "id": 1, "name": "Frontend", "slug": "frontend" },
        "tags": [
          { "id": 1, "name": "React", "slug": "react" },
          { "id": 2, "name": "TypeScript", "slug": "typescript" }
        ]
      }
    ],
    "total": 1,
    "page": 1,
    "size": 10
  }
}
```

### 2.2 Search Logic

The SQL query will be extended to use an OR condition across three scopes:

```
title       LIKE '%keyword%'   (existing)
excerpt     LIKE '%keyword%'   (existing)
tag name    LIKE '%keyword%'   (NEW)
```

The key design decision: **DISTINCT** is already used in the query (for tag joins), so matching via tag names will not produce duplicate rows.

### 2.3 Admin Endpoint Consistency

The admin endpoint `GET /api/v1/admin/articles?keyword=...` will also be extended with the same tag-name matching logic for consistency.

---

## 3. Implementation Plan

### 3.1 Affected Files

#### Backend

| File | Change |
|------|--------|
| `backend/src/main/resources/mapper/ArticleMapper.xml` | Extend `findPublished` and `findAll` queries to include tag name search |
| `backend/src/main/java/com/sean/blog/module/blog/service/ArticleService.java` | No changes (already passes `keyword` through to mapper) |
| `backend/src/main/java/com/sean/blog/module/blog/controller/ArticlePublicController.java` | No changes (already accepts `keyword` param) |

#### Frontend

| File | Change |
|------|--------|
| `frontend/src/components/blog/FilterBar.tsx` | Add search input field with debounce |
| `frontend/src/app/blog/page.tsx` | Add `keyword` state, pass to API call |
| `frontend/src/lib/api.ts` | Ensure `getArticles()` passes `keyword` to API |

### 3.2 Step-by-Step

#### Step 1: Extend Backend SQL Queries

**File:** `backend/src/main/resources/mapper/ArticleMapper.xml`

Modify the `findPublished` query's `<where>` clause from:

```xml
<if test="keyword != null and keyword != ''">
    AND (a.title LIKE CONCAT('%', #{keyword}, '%') OR a.excerpt LIKE CONCAT('%', #{keyword}, '%'))
</if>
```

To:

```xml
<if test="keyword != null and keyword != ''">
    AND (
        a.title LIKE CONCAT('%', #{keyword}, '%')
        OR a.excerpt LIKE CONCAT('%', #{keyword}, '%')
        OR a.id IN (
            SELECT at2.article_id FROM t_article_tag at2
            JOIN t_tag t2 ON at2.tag_id = t2.id
            WHERE t2.name LIKE CONCAT('%', #{keyword}, '%')
        )
    )
</if>
```

Apply the same change to the `findAll` query (used by the admin list endpoint).

#### Step 2: Frontend Search Bar Component

**File:** `frontend/src/components/blog/FilterBar.tsx`

Add a search input field to the existing filter bar. Key behavior:
- Text input with a search icon
- 300ms debounce before triggering search
- Clear button (x) to reset search
- The keyword is lifted to the parent `BlogListPage` component

```tsx
// SearchBar sub-component within FilterBar
const [inputValue, setInputValue] = useState('');
const debouncedValue = useDebounce(inputValue, 300);

useEffect(() => {
    onSearch(debouncedValue);
}, [debouncedValue]);
```

Note: `useDebounce` can be a custom hook or from a library like `use-debounce`.

#### Step 3: Wire Search State to Blog List Page

**File:** `frontend/src/app/blog/page.tsx`

Changes:
1. Add `keyword` to the page state
2. Pass `keyword` to `api.getArticles({ keyword, category, tag, page, size })`
3. Pass `onSearch` callback to `FilterBar`
4. When keyword changes, reset to page 1

```tsx
const [keyword, setKeyword] = useState('');

const handleSearch = (value: string) => {
    setKeyword(value);
    setPage(1); // Reset to first page on new search
};

// In the API call:
const data = await api.getArticles({ keyword, category: selectedCategory, page, size });
```

#### Step 4: Verify API Client Support

**File:** `frontend/src/lib/api.ts`

Ensure the `getArticles` function passes `keyword` through as a query parameter:

```tsx
async getArticles(params: {
    category?: number;
    tag?: number;
    keyword?: string;
    page?: number;
    size?: number;
}): Promise<PageResult<Article>> {
    const searchParams = new URLSearchParams();
    if (params.category) searchParams.set('category', String(params.category));
    if (params.tag) searchParams.set('tag', String(params.tag));
    if (params.keyword) searchParams.set('keyword', params.keyword);
    if (params.page) searchParams.set('page', String(params.page));
    if (params.size) searchParams.set('size', String(params.size));
    const res = await fetch(`${API_BASE}/articles?${searchParams}`);
    return res.json();
}
```

#### Step 5: Verify with Build

```bash
cd backend && mvn clean compile    # Verify backend compiles
cd frontend && npm run build       # Verify frontend builds
```

### 3.3 Edge Cases

| Scenario | Handling |
|----------|----------|
| Empty keyword | Keyword param omitted from API call; returns all published articles |
| Whitespace-only keyword | Trim input before sending; if empty after trim, omit param |
| Special characters in keyword | SQL LIKE handles most characters; backend parameter binding prevents SQL injection |
| No results found | Frontend shows empty state ("No articles found matching your search") |
| Search + category/tag filter combined | All conditions are AND-ed; keyword search narrows within the selected category/tag |
| Very short keyword (1 char) | Allowed; SQL LIKE will match broadly, which is acceptable for small dataset |

### 3.4 Design Considerations

1. **No dedicated search endpoint**: The existing list endpoint is extended rather than creating a separate `/api/v1/articles/search` endpoint. This keeps the API surface small and consistent.

2. **LIKE vs Full-Text Search**: MySQL LIKE with `%keyword%` is used instead of FULLTEXT index. For a personal blog with a small dataset (tens to low hundreds of articles), LIKE performance is adequate. The design doc explicitly excludes Elasticsearch from v1 scope.

3. **Tag name search via subquery**: The tag name matching uses a subquery rather than a JOIN to avoid the complexity of DISTINCT with multiple JOINs. The existing query already uses DISTINCT for the tag association JOIN path.
```

## 4. Verification Checklist

- [ ] Backend: searching by keyword "React" returns articles tagged "React" even if "React" is not in the title
- [ ] Backend: searching by keyword matches both title and tag names (OR logic)
- [ ] Backend: empty/omitted keyword returns all published articles (backward compatible)
- [ ] Frontend: search bar appears on blog list page
- [ ] Frontend: typing triggers debounced API call (300ms delay)
- [ ] Frontend: clearing search bar resets results to full list
- [ ] Frontend: search + category filter works together (AND logic)
- [ ] Edge case: no results shows empty state message
- [ ] Edge case: special characters do not break the query

---

## 5. File Manifest

| File | Action | Description |
|------|--------|-------------|
| `backend/src/main/resources/mapper/ArticleMapper.xml` | Modify | Extend SQL WHERE clause for tag name search |
| `frontend/src/components/blog/FilterBar.tsx` | Modify | Add search input with debounce |
| `frontend/src/app/blog/page.tsx` | Modify | Add keyword state and wire to API |
| `frontend/src/lib/api.ts` | Verify/Modify | Ensure keyword param is passed to API |

**4 files to touch. No new files to create.**
