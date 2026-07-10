# v1 MVP 发布方案

**日期：** 2026-07-10
**版本：** v1.0.0
**发布范围：** Sean's AI World 博客平台首次上线

---

## 1. 发布概述

| 项目 | 说明 |
|------|------|
| 发布类型 | 首次上线（MVP） |
| 影响范围 | 全新部署，不影响现有服务 |
| 预计停机 | 无（首次部署） |
| 回滚策略 | 保留上一版本镜像 / 数据库备份 |
| 风险等级 | 🟢 低（独立新服务，无外部依赖） |

### 架构概览

```
                    ┌──────────────┐
                    │   用户浏览器   │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Nginx (:80) │
                    └──┬────────┬──┘
                       │        │
              ┌────────▼──┐  ┌──▼──────────┐
              │ Next.js   │  │ Spring Boot  │
              │ (:3000)   │  │ (:8080)      │
              └───────────┘  └──────┬───────┘
                                    │
                           ┌────────▼───────┐
                           │  MySQL (:3306) │
                           └──────┬─────────┘
                                  │
                           ┌──────▼──────────┐
                           │  宿主机文件系统   │
                           │  /data/          │
                           └─────────────────┘
```

---

## 2. 部署前检查

### 2.1 代码检查

- [x] 代码已合并到 `master` 分支
- [x] `docker compose build` 全部镜像构建成功
- [ ] 敏感信息已移除（确认无硬编码密码、密钥）
- [ ] `.env` 文件已创建并配置生产环境密钥
- [ ] 前端 `NEXT_PUBLIC_API_URL` 已配置为生产环境地址

### 2.2 服务器环境

| 要求 | 说明 |
|------|------|
| 操作系统 | Linux（推荐 Ubuntu 22.04+） |
| Docker | 24.0+ |
| Docker Compose | 2.20+ |
| 内存 | ≥ 2GB（JVM + MySQL + Next.js） |
| 磁盘 | ≥ 20GB（含 MySQL 数据和文件存储） |
| 端口开放 | 80 (HTTP)、443 (HTTPS，后续) |

### 2.3 网络与域名

| 项目 | 说明 |
|------|------|
| 域名 | 待确认（建议：seanai.world 或 blog.seanai.world） |
| DNS 解析 | 域名 A 记录指向服务器 IP |
| HTTPS | 首次部署先 HTTP，后续加 Certbot/Let's Encrypt |

---

## 3. 部署步骤

### 3.1 准备服务器

```bash
# 1. SSH 登录服务器
ssh root@<server-ip>

# 2. 安装 Docker（如未安装）
curl -fsSL https://get.docker.com | sh
systemctl enable docker && systemctl start docker

# 3. 验证安装
docker --version       # ≥ 24.0
docker compose version # ≥ 2.20
```

### 3.2 创建目录结构

```bash
# 创建宿主机数据目录
mkdir -p /host/data/articles
mkdir -p /host/data/skills
mkdir -p /host/data/images
mkdir -p /host/data/mysql

# 创建应用目录
mkdir -p /opt/sean-blog
```

### 3.3 拉取代码 & 配置环境变量

```bash
# 1. 克隆仓库
cd /opt/sean-blog
git clone <repo-url> .
git checkout master

# 2. 创建生产环境 .env 文件
cat > .env << 'EOF'
DB_PASSWORD=<生成强密码，至少 16 位>
JWT_SECRET=<生成随机密钥，至少 32 位>
EOF

# 3. 生成随机密钥（可选，手动设置也可）
# openssl rand -base64 32  → 用于 JWT_SECRET
# openssl rand -base64 16  → 用于 DB_PASSWORD

# 4. 检查 nginx.conf 中的 server_name（如需绑定域名）
# 默认 `server_name _;` 接受所有域名
```

### 3.4 构建 & 启动

```bash
cd /opt/sean-blog

# 1. 构建所有镜像（首次约 5-10 分钟）
docker compose build

# 2. 启动所有服务（后台运行）
docker compose up -d

# 3. 查看服务状态
docker compose ps

# 期望输出：4 个服务均为 Up 状态
# sean-blog-nginx     → Up
# sean-blog-frontend  → Up
# sean-blog-backend   → Up
# sean-blog-mysql     → Up (healthy)
```

### 3.5 等待服务就绪

```bash
# 1. 等待 MySQL 健康检查通过（约 30 秒）
docker compose logs mysql | grep "ready for connections"

# 2. 等待后端启动完成（约 30-60 秒）
docker compose logs backend | grep "Started BlogApplication"

# 3. 验证 Nginx 可达
curl -I http://localhost
# 期望：HTTP/1.1 200 OK
```

---

## 4. 部署后验证

### 4.1 公开页面验证

| 检查项 | 验证方法 | 期望结果 |
|--------|---------|----------|
| 首页访问 | `curl http://<ip>/` | 200 OK，返回 HTML |
| 博客列表 | `curl http://<ip>/blog` | 200 OK |
| 项目列表 | `curl http://<ip>/projects` | 200 OK |
| 关于我 | `curl http://<ip>/about` | 200 OK |
| Skill 目录 | `curl http://<ip>/blog/skills` | 200 OK |

### 4.2 API 验证

```bash
# 公开 API — 无需认证
curl http://<ip>/api/v1/categories       # 分类列表
curl http://<ip>/api/v1/tags             # 标签列表
curl http://<ip>/api/v1/articles         # 文章列表
curl http://<ip>/api/v1/projects         # 项目列表
curl http://<ip>/api/v1/bundles          # Bundle 列表

# Admin API — 登录
curl -X POST http://<ip>/api/v1/admin/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
# 期望：返回 token
```

### 4.3 Admin 后台验证

1. 浏览器访问 `http://<ip>/admin/login`
2. 使用默认账号 `admin` / `admin123` 登录
3. 确认跳转到 Dashboard 页面
4. 逐页检查各管理模块（文章/项目/文件/联系记录）

### 4.4 功能完整性验证

| 模块 | 检查项 | 通过 |
|------|--------|------|
| 首页 | Hero + 精选项目 + 精选文章 + CTA 正常展示 | ☐ |
| 博客列表 | 分类/标签筛选 + 分页正常 | ☐ |
| 文章详情 | MD 渲染 + 代码高亮正常 | ☐ |
| Skill 浏览 | 文件树展开收起 + 文件内容预览 | ☐ |
| 项目列表 | 卡片展示 + 跳转链接正常 | ☐ |
| 关于我 | 内容正常展示 | ☐ |
| Admin 登录 | 登录/退出流程正常 | ☐ |
| Admin 文章 | 上传 .md + 发布/删除/精选 | ☐ |
| Admin 项目 | 创建/编辑/删除/精选 | ☐ |
| Admin Bundle | 上传 zip + 发布/取消 + 删除 | ☐ |
| Admin 联系 | 记录列表展示正常 | ☐ |
| 邮件/简历 | CTA 按钮触发正确 | ☐ |

---

## 5. 首次使用引导

### 5.1 登录 Admin

1. 访问 `http://<ip>/admin/login`
2. 默认账号：`admin` / `admin123`
3. **立即修改默认密码**：进入「修改密码」页面

### 5.2 创建第一篇博客

1. Admin → 文章管理 → 新建文章
2. 编写 .md 文件（第一行 `# 标题` 会被提取为文章标题）
3. 上传文件，选择分类和标签
4. 点击保存（状态为 DRAFT）
5. 点击发布按钮（状态变更为 PUBLISHED）

### 5.3 添加项目

1. Admin → 项目管理 → 新建项目
2. 填写标题、描述、URL、GitHub 链接
3. 上传封面图（可选）
4. 添加标签（JSON 数组格式：`["React","Spring Boot"]`）
5. 勾选精选可显示在首页

### 5.4 上传 Skill Bundle

1. 将文件整理成目录结构
2. 打包为 .zip 文件
3. Admin → 文件目录 → 上传 Bundle
4. 填写名称和描述，上传 zip
5. 点击发布

---

## 6. 回滚方案

由于是首次部署，回滚意味着下线服务：

```bash
# 停止所有服务
cd /opt/sean-blog
docker compose down

# 如需清理数据（谨慎！）
# rm -rf /host/data/mysql/*
```

后续迭代的回滚方案：

```bash
# 回滚到上一个版本
git checkout <previous-commit>
docker compose build
docker compose up -d

# 如数据库有迁移变更，恢复数据库备份
# docker exec sean-blog-mysql mysql -u root -p sean_blog < backup.sql
```

---

## 7. 日常运维

### 7.1 服务管理

```bash
# 查看日志
docker compose logs -f --tail=100 nginx
docker compose logs -f --tail=100 backend
docker compose logs -f --tail=100 frontend

# 重启单个服务
docker compose restart backend

# 全部重启
docker compose down && docker compose up -d
```

### 7.2 数据库备份

```bash
# 每日备份脚本（建议加入 crontab）
#!/bin/bash
BACKUP_DIR="/host/backups/mysql"
mkdir -p $BACKUP_DIR
docker exec sean-blog-mysql mysqldump -u root -p<password> sean_blog \
  | gzip > "$BACKUP_DIR/sean_blog_$(date +%Y%m%d_%H%M%S).sql.gz"

# 保留最近 7 天的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
```

建议 crontab 配置：
```
0 2 * * * /opt/sean-blog/scripts/backup-db.sh
```

### 7.3 日志清理

```bash
# Docker 日志容易占满磁盘，限制日志大小
# 在 docker-compose.yml 中为每个服务添加：
# logging:
#   driver: "json-file"
#   options:
#     max-size: "10m"
#     max-file: "3"
```

### 7.4 更新部署

```bash
cd /opt/sean-blog
git pull origin master
docker compose build
docker compose up -d
```

---

## 8. 后续优化项（非本次发布范围）

- [ ] 配置 HTTPS（Let's Encrypt / Certbot）
- [ ] 配置域名 DNS 解析
- [ ] Nginx 添加 gzip 压缩、缓存头
- [ ] Docker 日志限制配置
- [ ] 数据库自动备份脚本
- [ ] 健康检查监控（Uptime Kuma 或其他）
- [ ] CI/CD 自动部署（GitHub Actions）
- [ ] 防火墙配置（仅开放 80/443 端口）

---

## 9. 发布检查清单

### 发布前

- [ ] 服务器环境已准备（Docker + Docker Compose）
- [ ] 代码已拉取到 `/opt/sean-blog`
- [ ] `.env` 文件已配置强密码和 JWT 密钥
- [ ] `nginx.conf` 已确认配置正确
- [ ] `docker compose build` 成功
- [ ] 数据目录 `/host/data/` 已创建

### 发布中

- [ ] `docker compose up -d` 启动成功
- [ ] 4 个容器全部运行正常
- [ ] MySQL 健康检查通过

### 发布后

- [ ] 公开页面全部可访问（首页/博客/项目/Skill/关于我）
- [ ] Admin 登录正常
- [ ] Admin 各模块功能正常
- [ ] 默认密码已修改
- [ ] 数据库备份脚本已配置

---

## 10. 联系人

| 角色 | 说明 |
|------|------|
| 开发者 | Sean |
| 部署环境 | 待确认（云服务器 / VPS） |
| 域名 | 待确认 |

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
