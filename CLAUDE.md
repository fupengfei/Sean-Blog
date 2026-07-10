# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

**Sean's AI World** — 个人技术博客，包含前台展示（首页、博客、项目、关于我、Skill 目录浏览）和 Admin 管理后台。

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| 后端 | Spring Boot 4.x + Spring MVC + MyBatis（模块化单体） |
| 数据库 | MySQL 8.0 |
| 文件存储 | Docker Volume 挂载宿主机目录（MD 文章、Skill 文件、图片） |
| 部署 | Docker Compose（Nginx + Next.js + Spring Boot + MySQL） |
| 认证 | JWT（Spring Security + jjwt），Admin 接口保护，公开接口无需认证 |

## 常用命令

```bash
# 后端编译
cd backend && mvn clean compile

# 前端开发 / 构建
cd frontend && npm install
cd frontend && npm run dev       # Next.js dev server (port 3000)
cd frontend && npm run build     # 生产构建

# Docker 部署
docker compose build              # 构建所有镜像
docker compose up -d              # 启动全部服务
```

## 架构

```
Nginx (80) → Next.js (3000) 前端页面
           → Spring Boot (8080) REST API → MySQL (3306)
                                         → 宿主机文件系统 (/data/)
```

### 后端模块分包（`com.sean.blog`）

| 模块 | 路径 | 职责 |
|------|------|------|
| `auth` | `module/auth/` | JWT 登录认证、密码修改 |
| `blog` | `module/blog/` | 文章 CRUD、分类、标签 |
| `project` | `module/project/` | 项目展示 CRUD |
| `file` | `module/file/` | 文件目录（zip 上传、目录树、文件读取） |
| `contact` | `module/contact/` | 邮件/简历请求记录 |
| `common` | `common/` | `Result<T>` / `PageResult<T>` / 统一异常处理 |
| `config` | `config/` | SecurityConfig、MyBatisConfig、WebMvcConfig |

- **公开 API** 路径：`/api/v1/*`，无需认证
- **Admin API** 路径：`/api/v1/admin/*`，需 `Authorization: Bearer <token>`
- 文章 Slug 格式：`{title-slug}-{timestamp}`，详情页 URL 友好
- 软删除：文章删除设置 `status = DELETED`，不物理删除

### 前端路由（Next.js App Router）

```
/                     → 首页
/blog                 → 文章列表（分类/标签筛选 + 分页）
/blog/[slug]          → 文章详情
/blog/skills          → Skill Bundle 列表
/blog/skills/[id]     → 文件树浏览（左树右内容）
/projects              → 项目列表
/about                 → 关于我（v1 硬编码）
/admin/*               → Admin 管理后台（需 JWT 登录）
```

### 文件存储路径

| 用途 | 容器内路径 |
|------|-----------|
| MD 文章 | `/data/articles/{article_id}/article.md` |
| Skill 文件 | `/data/skills/{bundle_id}/` |
| 图片资源 | `/data/images/` |

## 设计规范

设计系统定义在 `design/intellectual_professional/DESIGN.md`，**所有 UI 必须遵循**：

- **主色** Navy `#002045`，**辅色** Green `#0a6c44`
- **字体**：Inter（UI 元素）+ Source Serif 4（文章正文）
- **间距**：8px 倍数体系
- **最大宽度**：页面 1200px，文章列 720px
- **卡片**：用 `1px solid #E2E8F0` 边框代替阴影，hover 时轻微上浮
- **按钮**：主按钮实色 Navy 背景，次按钮 ghost + 1px 边框
- **设计稿参考**：`design/v2_1/` 到 `design/v2_4/` 目录下的 `code.html` + `screen.png`

## 关键约定

- 数据量小处理：精选卡片 `justify-center` 居中排列，不足一页不显示分页器，空状态用虚线占位卡片
- v1 范围外：评论、RSS、全文搜索、暗色模式、多用户/RBAC、国际化
- 「关于我」页面内容 v1 硬编码在前端组件中
- 密码 BCrypt 加密，默认管理员 `admin` / `admin123`（通过 SQL 脚本初始化）
- 前端 API 层封装在 `src/lib/api.ts`，类型定义在 `src/types/index.ts`

## 项目文档

完整设计文档、功能清单和实现计划位于 `docs/superpowers/`：
- `specs/2026-07-08-sean-blog-design.md` — 系统设计文档（API、数据库、架构）
- `specs/2026-07-08-sean-blog-feature-list.md` — 功能清单
- `plans/2026-07-08-sean-blog-implementation.md` — 20 步实现计划（含代码示例）

## 其他
每次对话用中文沟通