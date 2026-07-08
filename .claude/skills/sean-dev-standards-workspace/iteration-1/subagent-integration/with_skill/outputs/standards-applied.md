# Sean's Development Standards Applied to Article Search Plan

> **Iteration:** 1 -- Article Search Feature
> **Date:** 2026-07-08
> **Skill:** sean-dev-standards (overlay applied to subagent-driven-development workflow)

---

## Summary

All **7 sections** of sean-dev-standards were reviewed and applied to the article search implementation plan. Below is a detailed trace of how each standard influenced the plan.

---

## Section 1: Database Design Standards

| Standard | How It Was Applied |
|---|---|
| **1.1 Audit fields** (created_by, created_at, updated_by, updated_at, is_deleted) | Plan includes a V2 migration to add these fields to all 8 database tables. Current V1 schema lacks them entirely. |
| **1.2 CRUD operations** | All new search queries explicitly filter `is_deleted = 0`. Existing queries are flagged for update (Phase B, Step B4). Deletion operations switch from physical DELETE to soft delete (`is_deleted = 1`). |
| **1.3 Indexes** | Plan includes `idx_article_is_deleted`, `idx_tag_is_deleted`, and composite `idx_article_status_deleted` indexes. Also adds `idx_article_title` for search performance and `idx_article_created_at` for common sort operations. |

**Plan references:** Section 2 (Database Changes), Section 3.7 (All Queries Must Include is_deleted)

---

## Section 2: Git Workflow Standards

| Standard | How It Was Applied |
|---|---|
| **2.1 Branch naming** | Plan specifies branch name `feature/article-search` (non-worktree) or `worktree-feature+article-search` (worktree mode), following the `feature/xxx` and `worktree-feature+xxx` conventions. |
| **2.2 Commit messages** | Plan provides example commit messages using Conventional Commits format: `feat(blog): add article search by title keyword and tag names`. Subject in Chinese where appropriate. |
| **2.3 PR checklist** | Plan includes a PR merge checklist at the end, covering: compilation, tests, debug code removal, commit message format, database migration scripts, and test coverage. |

**Plan references:** Section 7 (Branch & Commit Strategy)

---

## Section 3: API Design Standards

| Standard | How It Was Applied |
|---|---|
| **3.1 URL design** | Search endpoint uses RESTful style: `GET /api/v1/articles/search`. kebab-case path, `/api/v1/` version prefix, public API (no `/admin/` segment). Query parameters use camelCase (`tagNames`, `pageSize`). |
| **3.2 Unified response** | Search endpoint returns `Result<PageResult<Article>>` -- the standard `{ code, message, data }` wrapper with `{ records, total, page, pageSize }` for pagination. |
| **3.3 Error codes** | Plan specifies: 200 (success), 400 (missing both keyword and tagNames), 401/403 (N/A for public endpoint), 404 (no results -- returns empty list, not 404), 500 (server error, caught by GlobalExceptionHandler). |
| **3.4 Pagination** | Uses `page` (1-based) and `pageSize` (default 10, max 50) parameters. Response includes `total`, `page`, `pageSize`. |

**Plan references:** Section 3.6 (Controller Endpoint), Section 3.4 (Mapper Changes)

---

## Section 4: Code Review Standards

| Standard | How It Was Applied |
|---|---|
| **4.1 Issue grading** | Plan acknowledges review levels: Critical (SQL injection -- prevented by MyBatis parameterized queries), Major (LIKE vs FULLTEXT performance -- documented as trade-off), Minor (naming conventions -- followed per p3c), Suggestion (debounce timing -- noted for future tuning). |
| **4.2 Review dimensions** | Plan addresses: Security (no auth bypass, parameterized SQL), Performance (new indexes, DISTINCT optimization noted), Readability (clear method names, DTO separation), Maintainability (search logic isolated in dedicated mapper/service methods), Test coverage (verification steps for each phase). |

**Plan references:** Section 6 (Architecture Decisions & Trade-offs), Phase verification steps

---

## Section 5: Error Handling & Logging Standards

| Standard | How It Was Applied |
|---|---|
| **5.1 Exception handling** | Controller validates input (returns 400 if both keyword and tagNames are null). Service exceptions propagate to GlobalExceptionHandler. No silent exception swallowing. |
| **5.2 Logging** | Service method uses SLF4J `log.info()` for search operations (INFO level: key business node -- search request with parameters and result count). No System.out.println or console.log. Log includes context: keyword, tagNames, result count. No logging in loops. |

**Plan references:** Section 3.5 (Service Layer -- log.info call), Section 3.6 (Controller -- input validation)

---

## Section 6: Java Development Standards (Alibaba p3c)

| Standard | How It Was Applied |
|---|---|
| **6.1 Naming** | Classes: `ArticleSearchRequest` (UpperCamelCase). Methods: `searchArticles()`, `countSearchPublished()` (lowerCamelCase). DTO fields: `tagNames` (lowerCamelCase). Table columns: `is_deleted`, `created_by` (snake_case). |
| **6.2 Code structure** | `@Override` on mapper implementations (MyBatis handles this). `@Data` (Lombok) for entities -- no deprecated API usage. |
| **6.3 Collections** | `new HashMap<>(8)` with initial capacity (expectedSize/0.75 + 1) in search service method. |
| **6.4 Concurrency** | Not directly applicable to search feature (stateless service, no thread pools). |
| **6.5 Database** | Table/field names: snake_case (`t_article`, `is_deleted`). Index naming: `idx_article_title`, `idx_article_is_deleted`. No `SELECT *` -- mapper XML lists specific columns. |
| **6.6 Other** | SLF4J logging (not direct Logback). No magic values -- page defaults are constants at minimum (`defaultValue = "1"`). |

**Plan references:** Section 3.4 (Mapper -- explicit column list), Section 3.5 (Service -- HashMap capacity)

---

## Section 7: Release Notes

The release notes will be generated after implementation is complete, per section 7.2.

**Planned file:** `docs/release-notes/2026-07-08-article-search.md`

The release notes will document:
- Features implemented (title keyword search, tag name filtering, combined search)
- Database changes (audit fields + search indexes)
- API additions (`GET /api/v1/articles/search`)
- Design decisions (LIKE vs FULLTEXT, endpoint placement, debounce strategy)
- Known limitations (no full-text search, no search highlighting, case-sensitive tag matching)
- Code metrics (files changed, lines added)

---

## Standards NOT Directly Applied (with justification)

| Standard | Reason |
|---|---|
| **Section 4 (full code review)** | Code review is an execution-phase activity. The plan sets up review criteria but actual review happens during implementation. |
| **Section 2.3 (PR merge)** | PR not yet created -- plan is pre-implementation. PR checklist is included in the plan for future use. |
| **Section 7 (Release Notes generation)** | Release notes generated after merge, not during planning. Template reference included. |

---

## Conflicts & Resolutions

| Potential Conflict | Resolution |
|---|---|
| Original v1 scope says "no search" | User explicitly requested search. sean-dev-standards section 8 (core principle 5): **user instruction takes priority**. Feature added to scope. |
| Implementation plan uses physical DELETE | sean-dev-standards requires soft delete. Plan switches all deletions to `is_deleted = 1`. This is a breaking change to the original plan -- documented as such. |
| Original schema lacks audit fields | sean-dev-standards mandates audit fields. Plan adds V2 migration to retrofit all tables. Forward-compatible: new tables get fields in V1 init schema. |
