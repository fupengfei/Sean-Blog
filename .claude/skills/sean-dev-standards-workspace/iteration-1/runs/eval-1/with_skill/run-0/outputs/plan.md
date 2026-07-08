# Iteration 1: Article Search Feature -- Implementation Plan

> **Date:** 2026-07-08
> **Methodology:** Subagent-Driven Development
> **Standards Overlay:** sean-dev-standards (applied in full)
> **Project Phase:** Greenfield -- no backend/frontend code exists yet

---

## 1. Feature Overview

### 1.1 What We Are Building

Add article search functionality to Sean's AI World blog, supporting:

| Search Mode | Description | Example |
|---|---|---|
| **Title keyword search** | Fuzzy/partial match on article title | Search "Spring" returns articles with "Spring Boot", "Spring Security" in title |
| **Tag-based search** | Filter articles by one or more tag names | Search by tag "React" returns all React articles |
| **Combined search** | Title keyword + tag names simultaneously | "Docker" articles tagged "DevOps" |

### 1.2 Scope vs. Existing v1 Plan

The original v1 feature list marks "full-text search" as out of scope. This iteration adds a focused, structured search (title + tags) that is **distinct from full-text search**:

- **This iteration (in scope):** Title LIKE matching + tag name filtering, with dedicated search UI
- **Not in scope:** Full-text index search across article body content, natural language search, relevance scoring

### 1.3 Relationship to Existing Filters

The existing `GET /api/v1/articles` endpoint already plans `?category=&tag=&keyword=` parameters for list filtering. This iteration:

1. **Enhances** the existing keyword parameter to also search by tag names (not just tag IDs)
2. **Adds** a dedicated search UI component (search bar) on the blog list page
3. **Adds** a search results view with clear indication of active search terms
4. **Preserves** backward compatibility with existing category/tag filter approach

---

## 2. Database Changes

### 2.1 Schema Update: Add Audit Fields

The sean-dev-standards require all tables to have audit fields. The current V1 schema lacks `created_by`, `updated_by`, and `is_deleted`.

**Migration script:** `backend/src/main/resources/db/migration/V2__add_audit_fields.sql`

```sql
-- Add audit fields to all tables (per sean-dev-standards section 1.1)

ALTER TABLE t_article
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_category
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_tag
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_project
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_file_bundle
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_file_node
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_contact_record
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE t_admin_user
    ADD COLUMN created_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN updated_by VARCHAR(100) NOT NULL DEFAULT 'system',
    ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0;
```

### 2.2 New Indexes for Search Performance

```sql
-- Title search optimization (per sean-dev-standards section 1.3)
CREATE INDEX idx_article_title ON t_article(title);
CREATE INDEX idx_article_is_deleted ON t_article(is_deleted);
CREATE INDEX idx_article_created_at ON t_article(created_at);

-- Tag name search optimization
CREATE INDEX idx_tag_name ON t_tag(name);
CREATE INDEX idx_tag_is_deleted ON t_tag(is_deleted);

-- Composite index for common query pattern
CREATE INDEX idx_article_status_deleted ON t_article(status, is_deleted);
```

---

## 3. Backend Implementation

### 3.1 File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `module/blog/entity/Article.java` | Modify | Add audit fields |
| `module/blog/entity/Category.java` | Modify | Add audit fields |
| `module/blog/entity/Tag.java` | Modify | Add audit fields |
| `module/blog/mapper/ArticleMapper.java` | Modify | Add search method |
| `module/blog/mapper/ArticleMapper.xml` | Modify | Add search SQL with tag name join |
| `module/blog/service/ArticleService.java` | Modify | Add search service method |
| `module/blog/controller/ArticlePublicController.java` | Modify | Add search endpoint |
| `module/blog/dto/ArticleSearchRequest.java` | New | Search request DTO |
| `common/PageResult.java` | Verify | Ensure compatible with existing design |

### 3.2 Entity Updates (Audit Fields)

All entity classes must add the sean-dev-standards audit fields:

```java
// Added to Article.java, Category.java, Tag.java, etc.
private String createdBy;
private String updatedBy;
private Boolean isDeleted;  // false = active, true = soft-deleted
```

### 3.3 Search Request DTO

**New file:** `backend/src/main/java/com/sean/blog/module/blog/dto/ArticleSearchRequest.java`

```java
package com.sean.blog.module.blog.dto;

import jakarta.validation.constraints.Min;
import lombok.Data;

@Data
public class ArticleSearchRequest {
    private String keyword;       // Title keyword (fuzzy match)
    private String tagNames;      // Comma-separated tag names, e.g. "React,Spring"
    @Min(1)
    private Integer page = 1;
    @Min(1)
    private Integer pageSize = 10;
}
```

### 3.4 Mapper Changes

**ArticleMapper.java** -- add new method:

```java
/**
 * Search published articles by title keyword and/or tag names.
 * Supports combined search: both keyword and tagNames can be provided together.
 * All queries filter is_deleted = 0 per sean-dev-standards section 1.2.
 */
List<Article> searchPublished(Map<String, Object> params);
long countSearchPublished(Map<String, Object> params);
```

**ArticleMapper.xml** -- add new query:

```xml
<!-- Search: title keyword + tag name filtering -->
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

**Key design decisions:**
- Using `LIKE CONCAT('%', #{keyword}, '%')` for title matching (not full-text index). Sufficient for small-medium blogs.
- Tag search uses `IN` subquery on tag names (case-sensitive exact match on tag name).
- All queries include `is_deleted = 0` per sean-dev-standards section 1.2.
- `SELECT DISTINCT` needed because article-tag JOIN can produce duplicate rows.

### 3.5 Service Layer

**ArticleService.java** -- add search method:

```java
/**
 * Search published articles by title keyword and/or tag names.
 * Applies sean-dev-standards: is_deleted = 0 filtering, pagination.
 *
 * @param keyword  Title keyword for fuzzy match (nullable)
 * @param tagNames Comma-separated tag names (nullable), e.g. "React,Spring Boot"
 * @param page     Page number (1-based)
 * @param pageSize Page size
 * @return Paginated search results
 */
public PageResult<Article> searchArticles(String keyword, String tagNames,
                                           int page, int pageSize) {
    Map<String, Object> params = new HashMap<>(8);  // p3c: init with capacity
    params.put("keyword", keyword);
    params.put("offset", (page - 1) * pageSize);
    params.put("pageSize", pageSize);

    // Parse comma-separated tag names into list
    if (tagNames != null && !tagNames.trim().isEmpty()) {
        List<String> tagNameList = Arrays.stream(tagNames.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
        params.put("tagNames", tagNameList);
    }

    List<Article> articles = articleMapper.searchPublished(params);
    long total = articleMapper.countSearchPublished(params);

    log.info("Article search: keyword='{}', tagNames='{}', found {} results", 
             keyword, tagNames, total);  // SLF4J logging per sean-dev-standards section 5.2

    return new PageResult<>(articles, total, page, pageSize);
}
```

### 3.6 Controller Endpoint

**ArticlePublicController.java** -- add search endpoint:

```java
/**
 * Search articles by title keyword and/or tag names.
 * Public endpoint -- no authentication required.
 *
 * GET /api/v1/articles/search?keyword=Spring&tagNames=React,Java&page=1&pageSize=10
 */
@GetMapping("/search")
public Result<PageResult<Article>> searchArticles(
        @RequestParam(required = false) String keyword,
        @RequestParam(required = false) String tagNames,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "10") @Min(1) @Max(50) int pageSize) {

    if (keyword == null && tagNames == null) {
        return Result.error(400, "At least one of keyword or tagNames is required");
    }

    PageResult<Article> result = articleService.searchArticles(keyword, tagNames, page, pageSize);
    return Result.success(result);
}
```

**Note on URL design:** The search endpoint is added to the existing `ArticlePublicController` at path `/api/v1/articles/search`. This follows sean-dev-standards section 3.1 (RESTful, kebab-case, /api/v1/ prefix, public API path). An alternative would be a standalone `/api/v1/search` but nesting under `/articles` keeps the API organized by resource.

### 3.7 All Queries Must Include is_deleted

Per sean-dev-standards section 1.2, ALL existing queries must be updated to include `is_deleted = 0`:

| Mapper XML | Queries to update |
|---|---|
| `ArticleMapper.xml` | `findPublished`, `findBySlug`, `findFeatured`, `findAll`, `countPublished`, `countAll` |
| `CategoryMapper.xml` | All SELECT queries |
| `TagMapper.xml` | All SELECT queries |
| `ProjectMapper.xml` | All SELECT queries |

Deletion operations must switch from `DELETE` to `UPDATE SET is_deleted = 1`.

---

## 4. Frontend Implementation

### 4.1 File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/types/index.ts` | Modify | Add search request/response types |
| `src/lib/api.ts` | Modify | Add searchArticles API function |
| `src/components/blog/SearchBar.tsx` | **New** | Search input with tag suggestions |
| `src/components/blog/FilterBar.tsx` | Modify | Integrate SearchBar into existing filter bar |
| `src/app/blog/page.tsx` | Modify | Wire search state to API calls |

### 4.2 TypeScript Types

**Add to `src/types/index.ts`:**

```typescript
/** Search request parameters */
interface ArticleSearchParams {
  keyword?: string;
  tagNames?: string;       // Comma-separated: "React,Spring Boot"
  page?: number;
  pageSize?: number;
}

/** Search state for the UI */
interface SearchState {
  keyword: string;
  activeTags: string[];    // Selected tag names
  isSearching: boolean;    // True when search has been executed
}
```

### 4.3 API Client

**Add to `src/lib/api.ts`:**

```typescript
/**
 * Search articles by title keyword and/or tag names.
 * GET /api/v1/articles/search
 */
async searchArticles(params: ArticleSearchParams): Promise<ApiResult<PageResult<Article>>> {
  const query = new URLSearchParams();
  if (params.keyword) query.set('keyword', params.keyword);
  if (params.tagNames) query.set('tagNames', params.tagNames);
  if (params.page) query.set('page', String(params.page));
  if (params.pageSize) query.set('pageSize', String(params.pageSize));
  return this.get(`/articles/search?${query.toString()}`);
}
```

### 4.4 SearchBar Component

**New file:** `frontend/src/components/blog/SearchBar.tsx`

Design specifications (from `design/intellectual_professional/DESIGN.md`):

```
┌──────────────────────────────────────────────────────────────┐
│  🔍  Search articles by title or tag...                      │
│  ┌──────┐ ┌──────────┐                                      │
│  │ React │ │ Spring   │  (active tag pills with × remove)   │
│  └──────┘ └──────────┘                                      │
└──────────────────────────────────────────────────────────────┘
```

**Component specification:**

| Property | Value |
|---|---|
| **Border** | `1px solid #CBD5E0` (gray-300), becomes `#002045` (Navy primary) on focus |
| **Height** | `48px` (6 x 8px grid) |
| **Icon** | Magnifying glass SVG, 20px, positioned left with 16px padding |
| **Font** | Inter, 16px |
| **Placeholder** | "Search articles..." |
| **Active tags** | Small pills below the search bar: Navy background, white text, `×` remove button |
| **Tag suggestions** | Dropdown below search bar, shows matching tag names as user types |
| **Empty state** | When no results: dashed placeholder card with "No articles match your search" |

**Behavior:**
- Debounced input (300ms) before triggering tag suggestions
- Search executes on Enter key or after 500ms debounce
- Tag pills show below the input when selected
- Clicking a tag pill removes it and re-executes search
- URL query params sync with search state (`?keyword=...&tagNames=...`)

### 4.5 Blog List Page Integration

**Modify `frontend/src/app/blog/page.tsx`:**

The search bar integrates into the existing FilterBar area. The page manages search state:

```typescript
// Search state management
const [searchState, setSearchState] = useState<SearchState>({
  keyword: '',
  activeTags: [],
  isSearching: false,
});

// Derived: whether to use search API or regular list API
const fetchArticles = searchState.isSearching
  ? () => api.searchArticles({ keyword: searchState.keyword, tagNames: searchState.activeTags.join(','), page, pageSize })
  : () => api.getArticles({ category, tag, page, pageSize });
```

**UI layout:**
1. **SearchBar** at the top of the blog list page
2. **FilterBar** (category/tag filter chips) below the search bar -- hidden when search is active, or shown as secondary filters
3. **Active search indicator:** When search is active, show "Search results for: 'keyword' + Tag1, Tag2" with a "Clear search" link
4. **Results:** ArticleCard grid (same cards as normal list)
5. **Pagination:** Same paginator, hidden when results < 1 page
6. **Empty state:** Dashed placeholder card when 0 results

### 4.6 URL Synchronization

Search parameters should be reflected in the URL for shareability:

```
/blog?keyword=Spring&tagNames=React,Java&page=1
```

Use Next.js `useSearchParams()` and `useRouter()` for bidirectional sync.

---

## 5. Implementation Task Breakdown

Tasks are ordered for subagent-driven-development. Each task is independently verifiable.

### Phase A: Database Foundation (Task 1)

| Step | Description | Files |
|------|-------------|-------|
| A1 | Create V2 migration: add audit fields to all 8 tables | `V2__add_audit_fields.sql` |
| A2 | Create V3 migration: add search performance indexes | `V3__add_search_indexes.sql` |
| A3 | Update V1 init schema to include audit fields from start | `V1__init_schema.sql` (amend) |

**Depends on:** Nothing (first task)
**Verification:** Run migrations against MySQL, verify columns exist

### Phase B: Entity & Mapper Updates (Task 2)

| Step | Description | Files |
|------|-------------|-------|
| B1 | Update Article entity with audit fields | `entity/Article.java` |
| B2 | Update Category entity with audit fields | `entity/Category.java` |
| B3 | Update Tag entity with audit fields | `entity/Tag.java` |
| B4 | Update all existing mapper XMLs to include `is_deleted = 0` | `ArticleMapper.xml`, `CategoryMapper.xml`, `TagMapper.xml`, etc. |
| B5 | Add `searchPublished` and `countSearchPublished` to ArticleMapper | `mapper/ArticleMapper.java`, `ArticleMapper.xml` |

**Depends on:** Phase A
**Verification:** Unit test for search queries with test data

### Phase C: Service & Controller (Task 3)

| Step | Description | Files |
|------|-------------|-------|
| C1 | Create `ArticleSearchRequest` DTO | `dto/ArticleSearchRequest.java` |
| C2 | Add `searchArticles()` to ArticleService | `service/ArticleService.java` |
| C3 | Add `GET /api/v1/articles/search` endpoint to controller | `controller/ArticlePublicController.java` |
| C4 | Update all service methods to set audit fields on create/update/delete | Various service files |

**Depends on:** Phase B
**Verification:** `curl` test the search endpoint with various keyword + tag combinations

### Phase D: Frontend Types & API Client (Task 4)

| Step | Description | Files |
|------|-------------|-------|
| D1 | Add `ArticleSearchParams` and `SearchState` types | `types/index.ts` |
| D2 | Add `searchArticles()` to API client | `lib/api.ts` |

**Depends on:** Phase C (API contract must be defined)
**Verification:** TypeScript compilation passes

### Phase E: SearchBar Component (Task 5)

| Step | Description | Files |
|------|-------------|-------|
| E1 | Create SearchBar component with input, debounce, and styling | `components/blog/SearchBar.tsx` |
| E2 | Add tag suggestion dropdown (fetches from `GET /api/v1/tags`) | Same file |
| E3 | Add active tag pills with remove functionality | Same file |
| E4 | Add keyboard navigation (Enter to search, Escape to clear) | Same file |

**Depends on:** Phase D
**Verification:** Visual check in browser, test input/focus/suggestion interactions

### Phase F: Blog Page Integration (Task 6)

| Step | Description | Files |
|------|-------------|-------|
| F1 | Add search state management to blog list page | `app/blog/page.tsx` |
| F2 | Integrate SearchBar above FilterBar | Same file |
| F3 | Add URL query param sync (keyword, tagNames) | Same file |
| F4 | Add active search indicator and "Clear search" action | Same file |
| F5 | Add empty state UI for zero search results | `components/blog/ArticleCard.tsx` or inline |

**Depends on:** Phase E
**Verification:** Full end-to-end search flow in browser

---

## 6. Architecture Decisions & Trade-offs

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Search endpoint at `/articles/search` not `/search` | Keeps API organized by resource; search is article-specific | If cross-entity search is needed later, a `/search` endpoint may be added |
| Tag search by name not ID | User-friendly; tag names are human-readable | Requires JOIN on `t_tag` table; ensure index on `t_tag.name` |
| LIKE not FULLTEXT | Sufficient for blog-scale data; simpler implementation | May need migration to FULLTEXT index if article count grows to 10,000+ |
| Debounced client-side search (not real-time server calls) | Reduces server load; better UX | Slight delay (300-500ms) before results update |
| URL query param sync | Shareable search URLs; browser back/forward works | Additional complexity in state management |
| Audit fields added to ALL tables in one migration | Consistent schema; sean-dev-standards requirement | Touches tables not directly related to search feature |

---

## 7. Branch & Commit Strategy

Per sean-dev-standards section 2:

- **Branch name:** `feature/article-search` (or `worktree-feature+article-search` if using worktree)
- **Commit messages:**

```
feat(blog): add audit fields to all database tables

Add created_by, updated_by, is_deleted columns per sean-dev-standards.
Update V1 init schema and create V2 migration.

feat(blog): add article search by title keyword and tag names

Implement searchPublished mapper query with LIKE on title and
tag name IN subquery. Add search endpoint at GET /api/v1/articles/search.

feat(blog): add SearchBar component with tag suggestions

Implement debounced search input with tag pill display and
suggestion dropdown. Integrate into blog list page.
```

- **PR checklist (section 2.3):**
  - [x] Code compiles (`mvn clean compile` + `npm run build`)
  - [ ] Tests pass
  - [x] No debug logging left in code
  - [x] Commit messages follow Conventional Commits
  - [x] Database migration scripts provided
  - [ ] Search endpoint covered by integration tests
