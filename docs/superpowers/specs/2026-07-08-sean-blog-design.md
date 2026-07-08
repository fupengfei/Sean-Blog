# Sean's AI World — 系统设计文档

> 版本: v1.0 | 日期: 2026-07-08

---

## 1. 概述

**Sean's AI World** 是一个个人技术博客展示网站，目标是通过展示个人项目、技术文章和技术资源，让访客认识作者。系统包含前台展示（首页、博客、项目、关于我）和 Admin 管理后台。

---

## 2. 技术栈

| 层 | 技术 | 说明 |
|----|------|------|
| 前端 | Next.js 14 + TypeScript + Tailwind CSS | SSR/SSG，匹配设计稿风格 |
| 后端 | Spring Boot 4.x + Spring MVC + MyBatis | 模块化单体，预留 Spring AI 2.x 集成 |
| 数据库 | MySQL 8.0 | 业务数据 + 文件元数据 |
| 文件存储 | 宿主机磁盘 + Docker Volume | MD 文章、skill 文件、图片 |
| 部署 | Docker Compose | Nginx + Next.js + Spring Boot + MySQL |
| 认证 | JWT (Spring Security + jjwt) | Admin 登录保护 |

---

## 3. 架构设计

### 3.1 整体架构图

```
┌─────────────────────────────────────────────────────┐
│                    Nginx (反向代理)                    │
│                   Port 80/443                       │
└─────────────────────┬───────────────────────────────┘
                      │
        ┌─────────────┴──────────────┐
        ▼                            ▼
┌───────────────┐          ┌──────────────────┐
│  Next.js 前端  │          │  Spring Boot 后端 │
│  (Port 3000)  │ ──API──▶ │   (Port 8080)    │
│               │          │                  │
│  - 首页        │          │  - blog 模块      │
│  - 博客列表/详情 │          │  - project 模块   │
│  - 项目展示     │          │  - contact 模块   │
│  - 关于我       │          │  - admin 模块     │
│  - Admin 页面  │          │  - file 模块      │
└───────────────┘          └───────┬──────────┘
                                   │
                          ┌────────▼────────┐
                          │     MySQL 8.0    │
                          │   (Port 3306)   │
                          └─────────────────┘
                          ┌─────────────────┐
                          │  宿主机文件目录    │
                          │  (Docker Volume) │
                          │  - articles/    │
                          │  - skills/      │
                          │  - images/      │
                          └─────────────────┘
```

### 3.2 后端模块分包

```
com.sean.blog
├── BlogApplication.java
├── module/
│   ├── blog/       # 文章管理、分类、标签
│   ├── project/    # 项目配置（名称、描述、URL、图片、标签）
│   ├── contact/    # 邮件/简历请求记录
│   ├── file/       # 文件系统：上传、目录解析、文件树
│   └── auth/       # JWT 登录认证
├── common/         # 通用拦截器、异常处理、工具类
└── config/         # Spring Security、MyBatis、WebMvc 配置
```

### 3.3 设计原则

- **前期数据量小**：首页精选区卡片居中对齐，不占满整行；列表无数据时不显示分页器
- **数据少时不过度空旷**：参考设计稿 v2_3 虚线占位卡片（"更多项目正在开发中"），使用占位元素保持版面完整
- **单模块依赖**：前台各页面所需数据通过独立 API 获取，无跨模块耦合

---

## 4. 数据库设计

### 4.1 表结构 ER 图

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│   t_article      │     │ t_category    │     │ t_tag            │
├─────────────────┤     ├──────────────┤     ├─────────────────┤
│ id (PK)          │◄────│ id (PK)       │     │ id (PK)          │
│ title            │     │ name          │     │ name             │
│ slug (UNIQUE)    │     │ slug          │     │ slug             │
│ content_md       │     │ created_at    │     │ created_at       │
│ content_html     │     └──────────────┘     └──────┬──────────┘
│ excerpt          │                                 │
│ cover_image      │     ┌─────────────────┐          │
│ category_id (FK) │     │ t_article_tag    │          │
│ status           │     ├─────────────────┤          │
│ is_featured      │     │ id (PK)          │          │
│ view_count       │     │ article_id (FK)  │──────────┘
│ created_at       │     │ tag_id (FK)      │
│ updated_at       │     └─────────────────┘
└─────────────────┘

┌─────────────────┐     ┌─────────────────────────────────────┐
│ t_project        │     │ t_file_bundle                        │
├─────────────────┤     ├─────────────────────────────────────┤
│ id (PK)          │     │ id (PK)                              │
│ title            │     │ name            (如 "my-claude-skills") │
│ description      │     │ description                          │
│ url (外部跳转)   │     │ root_path        (宿主机目录路径)     │
│ github_url       │     │ type             (SKILL / OTHER)     │
│ cover_image      │     │ status           (DRAFT / PUBLISHED) │
│ tags (JSON)      │     │ file_count       (文件总数缓存)      │
│ is_featured      │     │ created_at                            │
│ sort_order       │     │ updated_at                            │
│ status           │     └────────────┬────────────────────────┘
│ created_at       │                  │
│ updated_at       │                  │ 1 : N
└─────────────────┘     ┌────────────▼────────────────────────┐
                         │ t_file_node                           │
┌───────────────────┐   ├─────────────────────────────────────┤
│ t_contact_record   │   │ id (PK)                              │
├───────────────────┤   │ bundle_id (FK)                       │
│ id (PK)            │   │ parent_id      (FK → 自引用, 树结构) │
│ type (MAIL/RESUME) │   │ name            (文件名/目录名)       │
│ company_name       │   │ node_type        (DIRECTORY / FILE)  │
│ email              │   │ file_path        (相对路径, 读文件用) │
│ ip_address         │   │ file_size        (文件字节数)        │
│ created_at         │   │ sort_order                            │
└───────────────────┘   └─────────────────────────────────────┘

┌───────────────────┐
│ t_admin_user       │
├───────────────────┤
│ id (PK)            │
│ username (UNIQUE)  │
│ password_hash      │
│ created_at         │
│ updated_at         │
└───────────────────┘
```

### 4.2 表设计说明

| 表 | 说明 |
|----|------|
| t_article | 存 MD 原文 + 渲染后 HTML，前台读取不重复解析；slug 用于 URL 友好路径 |
| t_category | 文章分类，如"前端开发""后端架构" |
| t_tag | 文章标签，如"React""Spring Boot" |
| t_article_tag | 文章-标签多对多关联 |
| t_project | 项目展示，url 为外部跳转地址，tags 用 JSON 字段存标签数组 |
| t_file_bundle | 每次 zip 上传生成一个根目录项 |
| t_file_node | parent_id 自引用构建树结构，node_type 区分目录和文件 |
| t_contact_record | 记录邮件点击和简历请求数据 |
| t_admin_user | 单用户认证，预置一条 admin 记录 |

---

## 5. RESTful API 设计

### 5.1 公开接口（前台使用）

#### 博客

```
GET    /api/v1/articles              文章列表 (?category=&tag=&page=&size=&sort=latest)
GET    /api/v1/articles/{slug}       文章详情（view_count +1）
GET    /api/v1/articles/featured      精选文章，最多返回 6 条（首页用）
GET    /api/v1/categories             分类列表
GET    /api/v1/tags                   标签列表
```

#### 项目

```
GET    /api/v1/projects               项目列表 (?page=&size=)
GET    /api/v1/projects/featured      精选项目，最多返回 6 条（首页用）
```

#### 文件目录（Skill Bundle）

```
GET    /api/v1/bundles                已发布的 Bundle 列表
GET    /api/v1/bundles/{id}/tree      获取目录树 JSON（递归结构）
GET    /api/v1/bundles/{id}/file      获取文件内容 (?path=relative/path/to/file)
```

**目录树响应示例：**

```json
{
  "bundle": { "id": 1, "name": "my-claude-skills", "description": "..." },
  "tree": [
    {
      "id": 1, "name": "commands", "nodeType": "DIRECTORY",
      "children": [
        { "id": 2, "name": "deploy.md", "nodeType": "FILE", "fileSize": 2048 },
        { "id": 3, "name": "watch.md", "nodeType": "FILE", "fileSize": 1024 }
      ]
    },
    {
      "id": 4, "name": "hooks", "nodeType": "DIRECTORY",
      "children": [
        { "id": 5, "name": "on-save.sh", "nodeType": "FILE", "fileSize": 512 }
      ]
    },
    {
      "id": 6, "name": "README.md", "nodeType": "FILE", "fileSize": 4096 }
    }
  ]
}
```

#### 联系记录

```
POST   /api/v1/contact/mail           记录一次邮件点击 (body 可为空，后端记录 IP)
POST   /api/v1/contact/resume         记录简历请求 (body: { companyName, email })
```

### 5.2 Admin 接口（需 Authorization: Bearer <token>）

#### 认证

```
POST   /api/v1/admin/login            登录 (body: { username, password }) → { token, expiresIn }
PUT    /api/v1/admin/password          修改密码 (body: { oldPassword, newPassword })
```

#### 文章管理

```
GET    /api/v1/admin/articles          文章列表（含草稿，支持分页 + 搜索）
POST   /api/v1/admin/articles          新建文章 (multipart/form-data: mdFile + categoryId + tagIds + isFeatured)
PUT    /api/v1/admin/articles/{id}      编辑文章元数据 (JSON body)
DELETE /api/v1/admin/articles/{id}      删除文章（软删除，status = DELETED）
PUT    /api/v1/admin/articles/{id}/feature  切换精选状态
```

#### 分类 & 标签

```
GET    /api/v1/admin/categories        分类列表（管理用，含文章计数）
POST   /api/v1/admin/categories        新增分类
PUT    /api/v1/admin/categories/{id}   编辑分类
DELETE /api/v1/admin/categories/{id}   删除分类（仅无文章的分类可删）
GET    /api/v1/admin/tags              标签列表
POST   /api/v1/admin/tags              新增标签
PUT    /api/v1/admin/tags/{id}         编辑标签
DELETE /api/v1/admin/tags/{id}         删除标签
```

#### 项目管理

```
GET    /api/v1/admin/projects           项目列表
POST   /api/v1/admin/projects           新建项目 (multipart/form-data: coverImage + title + description + url + githubUrl + tags + isFeatured)
PUT    /api/v1/admin/projects/{id}      编辑项目
DELETE /api/v1/admin/projects/{id}      删除项目
PUT    /api/v1/admin/projects/{id}/feature  切换精选状态
PUT    /api/v1/admin/projects/{id}/sort     调整排序 (body: { sortOrder: 0 })
```

#### 文件目录管理

```
GET    /api/v1/admin/bundles             Bundle 列表（含 DRAFT + PUBLISHED）
POST   /api/v1/admin/bundles             上传 zip 文件 (multipart/form-data: zipFile + name + description)
                                          - 后端解压 zip → 宿主机 /data/skills/{bundle_id}/
                                          - 递归遍历目录 → 创建 t_file_node 记录
                                          - 返回 bundle 信息
DELETE /api/v1/admin/bundles/{id}        删除 Bundle（同时删除宿主机文件 + 数据库记录）
PUT    /api/v1/admin/bundles/{id}/publish  发布/取消发布 (body: { status: "PUBLISHED" | "DRAFT" })
GET    /api/v1/admin/bundles/{id}/tree   Admin 内预览目录树
```

#### 联系记录

```
GET    /api/v1/admin/contacts            联系记录列表 (?page=&size=&type=MAIL|RESUME)
```

---

## 6. 前端设计

### 6.1 前台路由

```
/                  → 首页
/blog              → 文章列表
/blog/[slug]       → 文章详情
/blog/skills       → Skill 目录浏览 (已发布 Bundle 列表)
/blog/skills/[id]  → 单个 Bundle 的文件树浏览
/projects         → 项目列表
/about             → 关于我
```

### 6.2 前台组件树

```
Layout
├── NavBar (固定顶部，Logo + 导航链接 + 搜索/主题图标)
├── <PageContent>
│   ├── HomePage
│   │   ├── HeroSection          (个人介绍 + CTA 按钮)
│   │   ├── FeaturedProjects     (精选项目卡片网格，居中排列)
│   │   ├── FeaturedArticles     (精选文章卡片)
│   │   └── CTASection           (底部 CTA：发送邮件 + 获取简历)
│   │       └── ResumeModal      (弹出表单：公司名称 + 邮箱)
│   │
│   ├── BlogListPage
│   │   ├── PageHeader           (标题 + 描述)
│   │   ├── FilterBar            (分类标签切换 + 排序下拉)
│   │   ├── ArticleCard (xN)     (封面图 + 分类标签 + 标题 + 摘要 + 日期)
│   │   └── Pagination           (分页器，数据少时不显示)
│   │
│   ├── ArticleDetailPage
│   │   ├── ArticleHeader        (标题、分类、标签、日期、阅读量)
│   │   ├── ArticleCover         (可选封面图)
│   │   └── MarkdownRenderer     (react-markdown + 代码高亮)
│   │
│   ├── SkillBrowserPage
│   │   ├── BundleCard (xN)      (Bundle 名称 + 描述 + 文件数)
│   │   └── (点击进入 Bundle 详情)
│   │       └── FileTreeView     (GitHub 风格目录树：展开/收起、文件图标、点击查看内容)
│   │           └── FileContentView (代码高亮 或 MD 渲染)
│   │
│   ├── ProjectListPage
│   │   ├── PageHeader
│   │   └── ProjectCard (xN)     (封面图 + 标签 + 标题 + 描述 + 跳转按钮)
│   │
│   └── AboutPage
│       ├── ProfileSection       (照片 + 个人介绍)
│       ├── SkillsSection        (技术栈卡片)
│       └── ContactSection       (邮箱、位置)
│
└── Footer (链接 + 社交图标 + 版权)
```

### 6.3 关于我页面数据

v1 版本中，「关于我」页面内容（个人介绍、技术栈、联系方式等）直接硬编码在 Next.js 页面组件中，不通过 Admin 管理。后续可扩展为 Admin 可编辑。

### 6.4 Admin 路由

```
/admin/login         → 登录页
/admin/dashboard     → 仪表盘首页（文章/项目/Bundle 数量概览）
/admin/articles      → 文章管理列表
/admin/articles/new  → 新建文章 (上传 MD + 设置元数据)
/admin/articles/[id]/edit → 编辑文章
/admin/categories    → 分类管理
/admin/tags          → 标签管理
/admin/projects      → 项目管理列表
/admin/projects/new  → 新建/编辑项目
/admin/bundles       → Bundle 列表
/admin/bundles/new   → 上传新 Bundle
/admin/contacts      → 联系记录列表
/admin/settings      → 修改密码
```

### 6.4 Admin 布局

```
AdminLayout
├── Sidebar (左侧固定)
│   ├── Logo / 站点名
│   ├── 仪表盘
│   ├── 文章管理
│   ├── 项目管理
│   ├── 文件目录
│   ├── 联系记录
│   └── 设置
├── Header (顶栏：面包屑 + 退出按钮)
└── <PageContent>
    ├── Dashboard               (统计卡片：文章数、项目数、Bundle 数)
    ├── ArticleManager          (表格 + 搜索 + 新增按钮)
    ├── ArticleEditor           (MD 文件上传区 + 分类/标签选择 + 精选勾选)
    ├── CategoryManager         (简单表格 + 新增/编辑弹窗)
    ├── TagManager              (同上)
    ├── ProjectManager          (表格 + 排序)
    ├── ProjectEditor           (表单：文本输入 + 封面图上传 + 标签)
    ├── BundleManager           (卡片列表 + 上传按钮)
    ├── BundleUploader          (拖拽上传 zip + 名称/描述表单)
    ├── ContactList             (只读表格，分页)
    └── PasswordForm            (旧密码 + 新密码 + 确认)
```

### 6.5 小数量数据处理策略

| 场景 | 处理方式 |
|------|----------|
| 精选项目不足 3 个 | 卡片居中排列，使用 `justify-center`，每张卡片保持固定宽度不拉伸 |
| 精选文章不足 3 篇 | 同上 |
| 博客列表为空 | 显示空状态提示 |
| 项目列表为空 | 显示虚线占位卡片（参考设计稿 v2_3） |
| Bundle 列表为空 | 博客页不展示 Skill 区块 |
| 只有一个 Bundle | 可以直接跳转到目录树，跳过列表页 |
| 分页数据不足一页 | 不显示分页器 |

### 6.6 前端技术细节

| 项 | 选择 |
|----|------|
| UI 样式 | Tailwind CSS（沿用 DESIGN.md 设计规范） |
| 弹窗/下拉 | Headless UI |
| MD 渲染 | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| 代码高亮 | `react-syntax-highlighter` |
| 文件树 | 自研递归组件，参考 GitHub 文件浏览器样式 |
| HTTP 请求 | `fetch` 或 `axios` |
| 数据获取 | SWR 或 React Query（缓存 + 自动刷新） |
| 部署 | `next build` + `next start`，通过 Docker 部署 |

**设计规范来源：** `design/intellectual_professional/DESIGN.md`
- 主色 Navy #002045，辅色 Green #0a6c44
- 字体 Inter（UI）+ Source Serif 4（正文）
- 最大宽度 1200px，文章列 720px
- 8px 间距体系，卡片 border 代替阴影

---

## 7. 文件目录系统（Skill Bundle）详细设计

### 7.1 上传处理流程

```
用户在 Admin 上传 zip 文件
        │
        ▼
1. 后端接收 multipart/form-data (zipFile + name + description)
        │
        ▼
2. 创建 t_file_bundle 记录 (status=DRAFT)
        │
        ▼
3. 解压 zip → 宿主机 /data/skills/{bundle_id}/
        │
        ▼
4. 递归遍历解压目录
   ├── 遍历到目录 → 创建 t_file_node (nodeType=DIRECTORY, parentId=父节点)
   └── 遍历到文件 → 创建 t_file_node (nodeType=FILE, filePath=相对路径, fileSize=xxx)
        │
        ▼
5. 更新 t_file_bundle.file_count 缓存
        │
        ▼
6. 返回 bundle 完整信息
```

### 7.2 前台展示流程

```
/blog/skills → 已发布 Bundle 卡片列表
        │
        ▼ 点击某个 Bundle
        │
/blog/skills/[id] → FileTreeView 页面
┌──────────────────────────────────┐
│  ← 返回         bundle 名称      │
├──────────────────────────────────┤
│  📁 commands/                    │  ← 可点击展开/收起
│  │  📁 dev/                      │
│  │  │  📄 deploy.md              │
│  │  │  📄 watch.md               │
│  │  📄 init.md                   │
│  📁 hooks/                       │
│  │  📄 on-save.sh                │
│  📄 README.md                    │
├──────────────────────────────────┤
│  # deploy.md                     │  ← 文件内容区
│  ...代码高亮渲染...               │
└──────────────────────────────────┘
```

### 7.3 文件类型支持

| 扩展名 | 展示方式 |
|--------|---------|
| `.md` | Markdown 渲染 |
| `.js` `.ts` `.tsx` `.jsx` `.py` `.java` `.go` `.rs` `.sh` `.bash` `.yaml` `.yml` `.json` `.xml` `.html` `.css` `.scss` `.sql` `.properties` `.gradle` | 代码高亮 |
| `.png` `.jpg` `.jpeg` `.gif` `.svg` `.webp` | 图片预览 |
| 其他 / 超过 200KB | 提示「不支持预览，请下载」 |

### 7.4 边界情况

| 场景 | 处理 |
|------|------|
| zip 内无文件 | 创建 Bundle 含空目录树，前台显示「此目录下暂无文件」 |
| zip 文件名含中文/特殊字符 | 确保后端解压 UTF-8 编码兼容 |
| 同名 Bundle 重复上传 | 允许，各自独立 ID |
| 删除 Bundle | 同时删除宿主机目录 + 数据库所有 t_file_node 记录 |
| 已发布 Bundle 数量为 0 | /blog/skills 页不显示 Skill 区块入口 |

---

## 8. 认证与安全

- Admin 所有接口通过 `Authorization: Bearer <jwt_token>` 认证
- 使用 Spring Security + 自定义 JWT Filter
- Token 有效期 24 小时，过期后前端跳转登录页
- 密码 BCrypt 加密存储
- 预置 admin 账号，通过 SQL 脚本初始化
- 前台 API（/api/v1/articles, /api/v1/projects 等）无需认证，公开访问

---

## 9. 部署架构

```
version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports: ["80:80", "443:443"]
    volumes: [./nginx.conf:/etc/nginx/nginx.conf]
    depends_on: [frontend, backend]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  backend:
    build: ./backend
    ports: ["8080:8080"]
    volumes:
      - /host/data/articles:/data/articles    # MD 文章文件
      - /host/data/skills:/data/skills        # Skill 目录文件
      - /host/data/images:/data/images        # 项目封面等图片
    environment:
      - DB_HOST=mysql
      - DB_PORT=3306
      - DB_NAME=sean_blog
      - DB_USER=root
      - DB_PASSWORD=${DB_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - FILE_BASE_PATH=/data
    depends_on: [mysql]

  mysql:
    image: mysql:8.0
    ports: ["3306:3306"]
    volumes:
      - /host/data/mysql:/var/lib/mysql
    environment:
      - MYSQL_ROOT_PASSWORD=${DB_PASSWORD}
      - MYSQL_DATABASE=sean_blog
```

**文件存储路径规范：**

| 用途 | 宿主机路径 | 容器内路径 |
|------|-----------|-----------|
| MD 文章 | `/host/data/articles/` | `/data/articles/` |
| Skill 文件 | `/host/data/skills/{bundle_id}/` | `/data/skills/{bundle_id}/` |
| 图片资源 | `/host/data/images/` | `/data/images/` |

---

## 10. 不在本期范围

- 评论系统
- RSS 订阅
- 全文搜索（Elasticsearch）
- 访问统计面板 / 数据分析
- 多用户角色 / RBAC
- 暗色模式切换
- CI/CD 自动化部署脚本
- 国际化 i18n

---

## 附录：功能清单索引

详见 [2026-07-08-sean-blog-feature-list.md](./2026-07-08-sean-blog-feature-list.md)
