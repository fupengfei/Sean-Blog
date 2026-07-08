# Sean's 开发规范

**标准化开发流程，消除团队协作中的隐性成本。用于数据库设计、API 规范、Git 工作流、代码审查、Release Notes 生成。**

---

## 概述

Sean's 开发规范是一套**通用软件开发约束层**，覆盖从数据库设计到发布总结的完整开发生命周期。它不是替代现有工作流的「重框架」，而是叠加在 subagent-driven-development 等 skill 之上的**轻量规范层**——开发者仍可使用熟悉的工具和流程，同时自动获得一致的代码质量保障。

在实际测试中，应用此规范后代码质量断言通过率从 **48.1% 提升至 100.0%**，且与 subagent-driven-development 等现有 skill 实现零冲突协作。

## 规范模块

六大规范模块覆盖开发全流程：

- **数据库设计** — 强制审计字段（created_by / created_at / updated_by / updated_at / is_deleted），软删除统一实现，杜绝物理删除事故
- **Git 工作流** — Conventional Commits + worktree 兼容双模式分支命名，PR 自查清单
- **API 设计** — RESTful URL 风格、统一返回结构、分页规范、错误码体系
- **代码审查** — Critical / Major / Minor / Suggestion 四级问题分级，五维度审查清单
- **错误处理 & 日志** — 禁止静默吞异常，SLF4J 日志门面，生产环境日志级别规范
- **释出总结** — 迭代结束自动生成标准化 Release Notes，包含需求说明、架构决策、指标统计、决策审计追踪

Java 项目额外遵循**阿里巴巴 Java 开发手册（p3c）**——命名、集合、并发、数据库等核心规则自动约束。

## 设计原则

- **叠加而非替代** — 不替换 subagent-driven-development、code-review、writing-plans 等 skill，而是在其上叠加规范约束
- **确认先行** — 每次触发先询问用户是否应用，不强制不打断
- **通用优先** — 规范本身语言无关，语言特定规则引用业界标准
- **用户指令最高优先级** — 规范与用户指令冲突时，以用户为准，并在 Release Notes 中记录例外

## 如何使用

在 Claude Code 中，当用户开始新迭代或新功能开发时，skill 自动触发并询问「是否应用 Sean's 开发规范？」。确认后，规范自动叠加到当前工作流中。

**典型使用场景：**

> 开始一个新功能：用户收藏文章。先设计数据库表结构，然后写 Controller/Service/Mapper。

skill 触发 → 确认 → 数据库 DDL 自动包含审计字段 → SQL 使用软删除 → API 遵循 RESTful 规范 → Java 代码符合 p3c 规范

> 使用 subagent-driven-development 启动迭代：实现文章搜索功能。

skill 叠加 → 计划中自动包含 API 设计规范 → Git 分支命名符合规范 → 子任务分配遵循审查标准

> 文章搜索功能开发完成，分支已合并到 master。生成 Release Notes。

skill 触发 → 自动生成 `docs/release-notes/YYYY-MM-DD-article-search.md` → 包含需求说明、架构决策、指标统计、决策审计追踪、后续事项

---

**适用平台：** Claude Code、Codex 及所有支持 skill 机制的编程 Agent

**适用项目：** 所有软件项目（通用规范，不局限于特定语言或框架）

**持续迭代：** 本 skill 随开发实践持续演进，用户可随时补充或修改规范条款
