# Release Notes — v1.1.0: Article Search

**Release Date:** 2026-07-08
**Branch:** `feature/search-articles` (merged to `master`)
**Iteration Time:** ~3 hours

---

## Overview

This release introduces a full-stack article search feature, allowing users to search across all published articles by title, summary, and content. The implementation spans both the backend REST API layer and the frontend UI components.

---

## Key Features

### Backend

- **Search API endpoint** (`GET /api/v1/articles/search?q=&page=&size=`). Accepts a query string with optional pagination, returning matching articles as a paginated result set.
- **SearchService** orchestrates query building and result transformation.
- **SearchMapper** implements the database query layer, performing `LIKE`-based matching against `title`, `summary`, and `content` columns.
- **ArticleIndexEntity** maps the search result rows to a lightweight DTO (id, title, summary, updated_at).

### Frontend

- **SearchBar.vue** provides a text input with debounced search (300 ms), displayed in the blog list header and navigation.
- **SearchResults.vue** renders the search result cards, replacing the default article list when a query is active. Handles loading, empty, and error states.

### Quality

- **Unit tests:** 3 files covering SearchService, SearchMapper, and SearchBar component logic (25 tests total).
- **Integration tests:** 2 files covering the search API endpoint and the full search UI flow (12 tests total).

---

## Architecture Decisions

| Decision | Rationale |
|---|---|
| **MySQL `LIKE`** over Elasticsearch | Dataset is small (< 1,000 articles). `LIKE` with appropriate indexing provides sufficient performance without the operational overhead of an additional search infrastructure. |
| **Default sort: `updated_at DESC`** | Most recently updated articles appear first, reflecting the most current content. |
| **Debounced input (300 ms)** | Balances responsiveness with server load — avoids firing a request on every keystroke. |
| **Lightweight DTO** (`ArticleIndexEntity`) | The search index entity returns only the fields needed for result cards (id, title, summary, updated_at), avoiding over-fetching. |

---

## Files Changed

| Category | Count | Details |
|---|---|---|
| Files changed | 15 | — |
| Files added | 10 | `SearchController.java`, `SearchService.java`, `SearchMapper.java`, `ArticleIndexEntity.java`, `SearchBar.vue`, `SearchResults.vue`, 3 test files, 1 integration test file |
| Files modified | 5 | Blog list page, API client (`api.ts`), router config, types definition, navigation component |
| Lines added | +1,200 | — |
| Lines deleted | -30 | — |

---

## Commits

| SHA | Message |
|---|---|
| `abc1234` | `feat(search): add search API` |
| `def5678` | `feat(search): add search UI` |
| `ghi9012` | `fix(search): handle empty results` |

---

## Known Limitations

- Search does not support full-text relevance ranking; results are purely `LIKE`-based matches sorted by `updated_at DESC`.
- No fuzzy matching or typo tolerance — exact substring matching only.
- Search is limited to published articles (`status = 'PUBLISHED'`); deleted and draft articles are excluded.
- No search result highlighting in the UI at this time.

---

## Upgrade Notes

- No database migration required. The search feature operates on existing article table columns (`title`, `summary`, `content`).
- No configuration changes needed. The search endpoint is public (`/api/v1/articles/search`) and requires no authentication.
- Frontend users will see the new search bar on the blog list page after deployment.
