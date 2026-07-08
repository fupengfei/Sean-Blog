---
name: sean-dev-standards
description: |
  软件开发规范叠加层 —— 数据库设计、Git 工作流、API 设计、代码审查、错误处理/日志、Java 规范、Release Notes 生成。
  
  **触发时机：** 用户开始新迭代、新功能、新模块开发时触发。典型触发语包括：
  "开始新功能"、"新模块"、"开始迭代"、"实现 XXX 功能"、"开发 XXX"、"build a feature"、
  "start a new iteration"、"implement XXX"。
  
  **行为：** 触发后先询问用户「是否应用 Sean's 开发规范？」，用户确认后才应用。
  
  **重要：** 这是一个叠加层（overlay）skill，不是替代品。可与其他 skill（如 subagent-driven-development、
  superpowers:* 系列）同时使用，互不冲突。如果规范与其他 skill 或用户指令冲突，以用户最新指令为准。
---

# Sean's 开发规范

这是一个**通用软件开发规范**，适用于所有项目、所有语言。部分规范有语言/框架特定子规则（如 Java 引用 Alibaba p3c）。

## 核心原则

1. **叠加而非替代** — 本 skill 在现有工作流之上叠加规范约束，不替代其他 skill
2. **确认先行** — 每次触发时先询问用户是否应用，不强制
3. **通用优先** — 规范本身语言无关，特定语言规则引用业界标准
4. **持续迭代** — 规范随项目实践不断演进，用户可随时补充或修改
5. **用户优先** — 当规范与用户指令冲突时，以用户指令为准

---

## 1. 数据库设计规范

所有数据库表必须包含审计字段，只支持软删除。

### 1.1 必备审计字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `created_by` | VARCHAR/STRING | 创建人 |
| `created_at` | DATETIME/TIMESTAMP | 创建时间 |
| `updated_by` | VARCHAR/STRING | 修改人 |
| `updated_at` | DATETIME/TIMESTAMP | 修改时间 |
| `is_deleted` | TINYINT/BOOLEAN | 是否删除（0=正常, 1=已删除），默认 0 |

### 1.2 CRUD 操作规范

- **创建（INSERT）**：同步设置 `created_by`、`created_at`、`updated_by`、`updated_at`（创建时四个字段都填充）
- **更新（UPDATE）**：同步更新 `updated_by`、`updated_at`
- **删除（DELETE）**：只做软删除，更新 `is_deleted = 1`，同步更新 `updated_by`、`updated_at`。**禁止物理删除**
- **查询（SELECT）**：所有查询必须带上 `is_deleted = 0` 条件，除非有明确需求查询已删除数据

### 1.3 索引规范

- 为 `is_deleted` 字段建立索引，或将其作为联合索引的前缀列
- 审计字段 `created_at` 建议建索引（常用于排序和时间范围查询）

---

## 2. Git 工作流规范

### 2.1 分支命名

兼容 worktree 和非 worktree 两种模式：

| 场景 | 非 Worktree 命名 | Worktree 命名 |
|------|------------------|---------------|
| 新功能 | `feature/xxx` | `worktree-feature+xxx` |
| 修复 | `fix/xxx` | `worktree-fix+xxx` |
| 重构 | `refactor/xxx` | `worktree-refactor+xxx` |
| 文档 | `docs/xxx` | `worktree-docs+xxx` |

- 使用 `+` 代替 `/` 以避免 worktree 路径冲突
- 分支名使用小写英文 + 短横线，例如 `feature/user-login`、`worktree-feature+page-view-analytics`

### 2.2 Commit Message 格式

遵循 Conventional Commits 规范：

```
<type>(<scope>): <subject>

<body>
```

**type 类型：**

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 重构（不改变功能） |
| `docs` | 文档变更 |
| `style` | 代码格式（不影响逻辑） |
| `test` | 测试相关 |
| `chore` | 构建/工具/依赖变更 |
| `perf` | 性能优化 |

**格式要求：**
- subject 使用中文或英文，不超过 50 字符
- body 说明做了什么、为什么、有什么影响（可选但建议）
- 如果是 worktree 开发，body 中注明 worktree 分支名

**示例：**
```
feat(user): 添加 JWT 登录认证

实现基于 Spring Security + jjwt 的用户登录，
包含 token 生成、验证和刷新逻辑。

Worktree: worktree-feature+jwt-auth
```

### 2.3 PR / 合并前自查

在提交 PR 或合并到主分支前，确认以下事项：
- [ ] 代码已通过编译
- [ ] 测试全部通过
- [ ] 无遗留的调试代码（console.log、System.out.println 等）
- [ ] commit message 符合规范
- [ ] 涉及数据库变更时，已提供迁移脚本
- [ ] 新功能有对应的测试覆盖

---

## 3. API 设计规范

### 3.1 URL 设计

- RESTful 风格，资源名使用复数名词
- 版本号放 URL 前缀：`/api/v1/`
- 公开 API 和管理 API 区分路径：`/api/v1/xxx` vs `/api/v1/admin/xxx`
- URL 使用小写 + 短横线（kebab-case）

**示例：**
```
GET    /api/v1/articles          # 文章列表
GET    /api/v1/articles/:id       # 文章详情
POST   /api/v1/admin/articles    # 创建文章
PUT    /api/v1/admin/articles/:id # 更新文章
DELETE /api/v1/admin/articles/:id # 删除文章（软删除）
```

### 3.2 统一返回结构

所有 API 响应使用统一结构：

```json
{
  "code": 200,
  "message": "success",
  "data": { }
}
```

**分页响应：**
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "records": [],
    "total": 100,
    "page": 1,
    "pageSize": 10
  }
}
```

### 3.3 错误码规范

| 范围 | 说明 |
|------|------|
| 2xx | 成功 |
| 400 | 参数校验失败 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

业务错误码在响应 body 的 `code` 字段中体现，HTTP 状态码保持语义正确。

### 3.4 分页规范

- 参数名：`page`（页码，从 1 开始）、`pageSize`（每页条数，默认 10）
- 响应中包含 `total`（总记录数）、`page`、`pageSize`

---

## 4. 代码审查规范

### 4.1 问题分级

| 级别 | 说明 | 处理要求 |
|------|------|---------|
| **Critical** | 安全漏洞、数据丢失风险、生产环境崩溃 | 必须修复后才能合并 |
| **Major** | 性能问题、逻辑错误、不合理的架构决策 | 需要修复，如有充分理由可记录后合并 |
| **Minor** | 命名不规范、缺少注释、代码风格 | 建议修复，不阻塞合并 |
| **Suggestion** | 更好的实现方式、优化建议 | 可选采纳 |

### 4.2 审查维度

审查时从以下维度检查代码：

- **安全**：认证/授权、注入防护、敏感数据泄露
- **性能**：N+1 查询、不必要的循环、缓存策略
- **可读性**：命名清晰、注释充分、逻辑易懂
- **可维护性**：模块化、单一职责、重复代码
- **测试覆盖**：核心逻辑有测试、边界条件覆盖

---

## 5. 错误处理 & 日志规范

### 5.1 异常处理

- **不允许静默吞异常**：catch 块不能为空，至少记录日志
- 业务异常使用自定义异常类，包含明确的错误码和消息
- Controller 层统一异常拦截，避免将异常堆栈直接暴露给前端
- 资源释放使用 try-with-resources（Java）或 finally 块

### 5.2 日志规范

| 级别 | 使用场景 |
|------|---------|
| **ERROR** | 系统错误、需要人工介入的问题 |
| **WARN** | 潜在问题、降级处理、可恢复的异常 |
| **INFO** | 关键业务节点（请求到达、操作完成、状态变更） |
| **DEBUG** | 开发调试信息，生产环境关闭 |

- 日志中必须包含足够的上下文信息（如请求 ID、用户 ID、操作类型）
- **禁止**在循环中打印 INFO 级别日志
- **禁止**使用 `System.out.println` 或 `console.log` 作为日志手段
- 生产环境日志级别默认为 INFO

---

## 6. Java 开发规范

Java 项目遵循**阿里巴巴 Java 开发手册（p3c）**，核心要点如下，完整规则见 [官方仓库](https://github.com/alibaba/p3c)。

### 6.1 命名规范
- 类名：UpperCamelCase
- 方法名、变量名：lowerCamelCase
- 常量：CONSTANT_CASE
- 包名：全小写，点分隔
- 抽象类以 Abstract 或 Base 开头，异常类以 Exception 结尾
- POJO 类中布尔变量不加 `is` 前缀（会导致序列化问题）

### 6.2 代码结构
- 重写方法必须加 `@Override` 注解
- 禁止使用已标记为 @Deprecated 的类或方法
- 静态成员通过类名访问，而非实例对象
- equals 和 hashCode 必须同时重写

### 6.3 集合处理
- HashMap 初始化时指定容量：`new HashMap<>(expectedSize / 0.75 + 1)`
- 使用 `entrySet()` 遍历 Map 而非 `keySet()` + `get()`
- 不要在 foreach 循环中 remove/add 元素，使用 Iterator

### 6.4 并发处理
- 线程池不允许使用 Executors 创建，用 ThreadPoolExecutor 手动指定参数
- SimpleDateFormat 是线程不安全的，使用 ThreadLocal 或 DateTimeFormatter

### 6.5 数据库相关
- 表名、字段名使用小写 + 下划线（snake_case）
- 索引命名：`idx_字段名`（普通索引）、`uk_字段名`（唯一索引）
- 不允许使用 `SELECT *`，必须列出具体字段

### 6.6 其他
- 使用 SLF4J 日志门面，禁止直接使用 Log4j/Logback 具体实现
- 魔法值（未经定义的常量）禁止出现在代码中，-1、0、1 除外

---

## 7. Release Notes 生成

每个迭代版本结束后，自动生成 release notes 到项目 `./docs/release-notes/` 目录。

### 7.1 文件命名

`YYYY-MM-DD-feature-name.md`

### 7.2 生成时机

- 功能分支合并到主分支时
- 迭代版本完成时
- 用户手动要求生成时

### 7.3 模板

详细的 release notes 模板和填写说明见 [references/release-notes-template.md](references/release-notes-template.md)。

生成时遵循以下原则：
- **如实记录**：不夸大、不遗漏，包括失败尝试和修复过程
- **以数据说话**：代码量、测试数、耗时等尽量用实际数字
- **决策可追溯**：关键决策记录选择理由和 trade-off
- **面向未来**：已知限制和后续事项帮助下一个迭代快速上手

---

## 8. 与其他 Skill 的协作

本 skill 设计为**叠加层**，与以下 skill 兼容协作：

| 协同 Skill | 协作方式 |
|-----------|---------|
| `superpowers:subagent-driven-development` | 规范约束各 subagent 的输出 |
| `superpowers:writing-plans` | 计划阶段引用本规范作为约束 |
| `superpowers:requesting-code-review` | 审查时按本规范的审查标准执行 |
| `superpowers:using-git-worktrees` | Git 规范兼容 worktree 命名方式 |
| `superpowers:executing-plans` | 执行过程中遵循数据库/API/日志规范 |

如果本规范的某条规则与其他 skill 的指令冲突，**以用户最新指令为准**，并在 release notes 中记录例外情况。

---

## 参考资源

| 资源 | 路径 |
|------|------|
| Release Notes 模板 | [references/release-notes-template.md](references/release-notes-template.md) |
| 阿里巴巴 Java 开发手册 | https://github.com/alibaba/p3c |
| Conventional Commits | https://www.conventionalcommits.org/ |
