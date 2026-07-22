# Sean's AI World

个人技术博客平台，包含前台展示和 Admin 管理后台。

## 技术栈

| 层 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| 后端 | Spring Boot 4.x + Spring AI 2.x + Spring MVC + MyBatis |
| 数据库 | MySQL 8.0 |
| 缓存 | Redis 7 |
| 部署 | Docker Compose（Nginx + Next.js + Spring Boot + MySQL + Redis） |
| 认证 | JWT（Spring Security + jjwt） |

## 快速开始

### 环境要求

- Docker 24.0+
- Docker Compose 2.20+

### 本地运行

```bash
# 1. 克隆仓库
git clone https://github.com/fupengfei/Sean-Blog.git
cd Sean-Blog

# 2. 创建环境变量文件
cp .env.example .env
# 编辑 .env，设置 DB_PASSWORD、JWT_SECRET、REDIS_PASSWORD、ADMIN_PASSWORD

# 3. 启动全部服务
docker compose up -d

# 4. 访问
# 前台: http://localhost
# Admin: http://localhost/admin/login
```

### 开发模式

```bash
# 后端（需要本地 MySQL + Redis）
cd backend && mvn spring-boot:run

# 前端
cd frontend && npm install && npm run dev
```

## 项目结构

```
Sean-Blog/
├── backend/                    # Spring Boot 后端
│   └── src/main/java/com/sean/blog/
│       ├── common/             # 通用工具（Result/异常处理）
│       ├── config/             # 安全/MyBatis/CORS 配置
│       └── module/
│           ├── auth/           # JWT 认证
│           ├── blog/           # 文章/分类/标签
│           ├── project/        # 项目展示
│           ├── file/           # 文件目录（Skill Bundle）
│           ├── contact/        # 联系记录
│           └── analytics/      # 访问统计
├── frontend/                   # Next.js 前端
│   └── src/
│       ├── app/                # 页面路由
│       ├── components/         # UI 组件
│       ├── lib/                # API 客户端/认证工具
│       └── types/              # TypeScript 类型
├── docs/                       # 项目文档
│   ├── release-notes/          # 发布说明
│   ├── delay/                  # 部署方案
│   └── superpowers/            # 设计文档/计划
├── design/                     # 设计稿
├── docker-compose.yml          # Docker 编排
├── nginx.conf                  # Nginx 反向代理
└── .env.example                # 环境变量模板
```

## 功能

### 前台页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 首页 | `/` | Hero + 精选项目 + 精选文章 + CTA |
| 博客列表 | `/blog` | 分类/标签筛选 + 分页 |
| 文章详情 | `/blog/[slug]` | Markdown 渲染 + 代码高亮 |
| Skill 目录 | `/blog/skills` | 文件树浏览 |
| 项目展示 | `/projects` | 卡片网格 |
| 关于我 | `/about` | 个人介绍 |

### Admin 管理

| 模块 | 说明 |
|------|------|
| 文章管理 | MD 文件上传、发布/删除、精选标记 |
| 分类/标签 | 增删改 |
| 项目管理 | 增删改、精选、排序 |
| 文件目录 | Zip 上传/解压、发布 |
| 联系记录 | 邮件/简历请求查看 |

## 部署

详见 [部署方案](docs/delay/2026-07-10-deployment-plan.md)。

```bash
# 生产环境启动
cp .env.example .env
# 编辑 .env：必须设置 DB_PASSWORD / JWT_SECRET / REDIS_PASSWORD / ADMIN_PASSWORD
docker compose up -d
```

首次启动后，管理员账号通过 `ADMIN_PASSWORD` 环境变量设置，登录后请立即修改密码。

## License

MIT
