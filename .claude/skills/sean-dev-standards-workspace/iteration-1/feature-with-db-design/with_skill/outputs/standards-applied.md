# Standards Applied — 用户收藏文章功能

## 应用的规范清单

以下所有规范来自 `/Users/fupengfei/coding-vibe/Sean-Blog/.claude/skills/sean-dev-standards/SKILL.md`。

---

### 1. 数据库设计规范 (SKILL.md 第1节)

| 规范 | 应用情况 |
|------|----------|
| **1.1 必备审计字段** | `t_user_favorite` 表包含全部 5 个审计字段：`created_by`, `created_at`, `updated_by`, `updated_at`, `is_deleted` |
| **1.2 CRUD 操作规范 — 创建** | INSERT 时同步填充四个审计字段（`created_by`, `created_at`, `updated_by`, `updated_at`），见 `UserFavoriteMapper.xml` 的 insert 语句和 `UserFavoriteService.addFavorite()` |
| **1.2 CRUD 操作规范 — 更新** | 软删除时同步更新 `updated_by`, `updated_at`，见 `softDeleteById` 方法 |
| **1.2 CRUD 操作规范 — 删除** | 只做软删除（`SET is_deleted = 1`），禁止物理删除，见 `softDeleteById` |
| **1.2 CRUD 操作规范 — 查询** | 所有查询 SQL 带上 `is_deleted = 0` 条件，见 Mapper XML 中所有 SELECT 语句 |
| **1.3 索引规范** | 为 `is_deleted` 建立索引 `idx_is_deleted`；为 `created_at` 建立索引 `idx_created_at`；额外为业务字段 `article_id` 和 `user_identifier` 建索引 |

---

### 2. Java 开发规范 / p3c (SKILL.md 第6节)

| 规范 | 应用情况 |
|------|----------|
| **6.1 命名规范** | 类名 `UpperCamelCase`（UserFavorite, UserFavoriteController）；方法名/变量名 `lowerCamelCase`（addFavorite, articleId）；包名全小写（`com.sean.blog.module.favorite`） |
| **6.1 POJO 布尔变量** | `is_deleted` 映射为 `Integer` 类型而非 `boolean`/`Boolean`，避免序列化问题 |
| **6.2 @Override 注解** | Entity 的 `toString()` 方法添加了 `@Override` 注解 |
| **6.5 数据库命名** | 表名 `t_user_favorite`、字段名 `article_id` / `user_identifier` 均使用小写 + 下划线（snake_case） |
| **6.5 索引命名** | 唯一索引 `uk_user_article`，普通索引 `idx_is_deleted` / `idx_created_at` / `idx_article_id` / `idx_user_identifier` |
| **6.5 禁止 SELECT *** | Mapper XML 使用 `<sql id="Base_Column_List">` 列出具体字段，不使用 `SELECT *` |
| **6.6 禁止魔法值** | Service 中定义 `DEFAULT_PAGE_SIZE = 10` 常量；-1, 0, 1 允许直接使用 |
| **6.6 SLF4J** | 所有日志使用 SLF4J（`LoggerFactory.getLogger`），Controller 和 Service 均如此 |

---

### 3. API 设计规范 (SKILL.md 第3节)

| 规范 | 应用情况 |
|------|----------|
| **3.1 URL 设计** | RESTful 风格：`POST /api/v1/favorites`（添加）、`DELETE /api/v1/favorites/{id}`（取消）、`GET /api/v1/favorites`（列表）、`GET /api/v1/favorites/check`（检查状态）。资源名使用复数 `favorites`，URL 使用 kebab-case |
| **3.2 统一返回结构** | 所有响应使用 `{ code, message, data }` 结构，成功时 `code=200, message="success"` |
| **3.2 分页响应** | 列表接口返回 `{ records, total, page, pageSize }` 结构 |
| **3.3 错误码规范** | 400（参数校验失败）、500（服务器内部错误），HTTP 语义正确 |
| **3.4 分页规范** | 参数名 `page`（从 1 开始）、`pageSize`（默认 10），响应含 `total`、`page`、`pageSize` |

---

### 4. 错误处理 & 日志规范 (SKILL.md 第5节)

| 规范 | 应用情况 |
|------|----------|
| **5.1 不允许静默吞异常** | 所有 catch 块均记录日志（`log.warn` 或 `log.error`），无空 catch 块 |
| **5.1 Controller 统一异常拦截** | Controller 层 catch 所有异常，不将堆栈直接暴露给前端，返回统一错误格式 |
| **5.2 日志级别** | ERROR（系统异常）、WARN（参数校验失败、业务拒绝）、INFO（关键业务节点：收藏/取消收藏成功）、DEBUG（查询结果数量）。禁止 `System.out.println` |
| **5.2 日志上下文** | 日志中包含足够上下文：用户标识（userIdentifier）、文章 ID（articleId）、收藏记录 ID |

---

### 5. 项目约定（来自 CLAUDE.md）

| 约定 | 应用情况 |
|------|----------|
| 后端模块分包 | `com.sean.blog.module.favorite` 遵循 `module/{功能}/` 分包结构 |
| 公开 API 路径 | 收藏接口使用 `/api/v1/*`（无需认证），符合公开 API 规范 |
| Controller/Service/Mapper 分层 | 严格遵循三层架构，Service 层含业务逻辑，Mapper 层仅数据访问 |
| 软删除 | 与文章模块一致，使用软删除策略 |

---

## 未应用的规范（及原因）

| 规范 | 原因 |
|------|------|
| **Git 工作流规范 (第2节)** | 本次任务仅为代码生成，不涉及 Git 操作 |
| **代码审查规范 (第4节)** | 本次任务不涉及 PR/代码审查流程 |
| **Release Notes 生成 (第7节)** | 本次为功能开发阶段，非版本发布节点 |
| **Admin 接口保护** | 收藏功能面向匿名访客，无需 Admin 认证；未来可扩展 Admin 管理端点 |
| **Lombok @Data** | 为保持文件自包含（无编译依赖），Entity 使用显式 getter/setter；项目其他模块使用 Lombok |

---

## 文件清单

| 文件 | 路径 |
|------|------|
| DDL SQL | `outputs/schema-user-favorites.sql` |
| Entity | `outputs/UserFavorite.java` |
| Mapper Interface | `outputs/UserFavoriteMapper.java` |
| Mapper XML | `outputs/UserFavoriteMapper.xml` |
| Service | `outputs/UserFavoriteService.java` |
| Controller | `outputs/UserFavoriteController.java` |
| 规范摘要 | `outputs/standards-applied.md`（本文件） |
