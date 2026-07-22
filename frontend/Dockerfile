# =============================================================================
# Sean's AI World Blog — Frontend Docker 镜像
# 使用多阶段构建，基于 Next.js Standalone 输出模式
# =============================================================================

# =============================================================================
# Stage 1: 构建阶段 — 使用 Node.js 20 Alpine 编译 Next.js 项目
# 使用 npm ci 而非 npm install 以利用 lock 文件确保依赖版本一致
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app
# 先复制依赖文件，利用 Docker 层缓存（源码修改时无需重复 npm ci）
COPY package.json package-lock.json ./
# 仅安装生产依赖，速度比 npm install 快且可重复
RUN npm ci
# 复制全部源码并执行 Next.js 构建
COPY . .
RUN npm run build
# Next.js standalone 模式：构建产物中不包含 public/ 目录，需手动复制
# 目录可能为空（如果项目没有 public/），用 2>/dev/null 忽略错误
RUN mkdir -p .next/standalone/public && (cp -r public/* .next/standalone/public/ 2>/dev/null || true)

# =============================================================================
# Stage 2: 运行阶段 — 仅复制 standalone 构建产物和静态资源
# Next.js Standalone 模式：生成一个独立的 server.js + node_modules，无需完整源码
# 优点：镜像体积小，启动快，仅包含运行时必需的依赖
# =============================================================================
FROM node:20-alpine
WORKDIR /app
# 设置 Node 运行环境为生产模式
ENV NODE_ENV=production
# 复制 standalone 目录（包含 server.js 和最精简的 node_modules）
COPY --from=builder /app/.next/standalone ./
# 复制静态资源（CSS、JS chunks、图片等），standalone 模式需单独复制
COPY --from=builder /app/.next/static ./.next/static
# 声明端口（Next.js 默认 3000）
EXPOSE 3000
# 通过 server.js 启动（standalone 模式入口文件，不依赖 next dev）
CMD ["node", "server.js"]
