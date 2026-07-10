FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build
# Next.js standalone 不包含 public/，复制过去（目录可能为空）
RUN mkdir -p .next/standalone/public && (cp -r public/* .next/standalone/public/ 2>/dev/null || true)

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
