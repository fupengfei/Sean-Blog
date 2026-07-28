# 文章微信分享功能 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 文章详情页新增微信分享入口——点击微信图标弹出二维码（桌面 popover / 移动居中模态），扫码在微信内打开文章以便转发，附带复制链接功能。

**Architecture:** 纯前端实现。新建自包含客户端组件 `WeChatShareButton`，用 `qrcode.react` 的 `QRCodeSVG` 将 `window.location.href` 渲染为矢量二维码；弹窗双形态用 Tailwind `sm:` 响应式类在同一组件内切换；集成点只有文章详情页 metadata 行一处。后端零改动。

**Tech Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS 3.4 + `qrcode.react` ^4.2 + `react-icons`（已有）

**Spec:** `docs/superpowers/specs/2026-07-28-wechat-share-design.md`

## Global Constraints

- **颜色 token 强制**：UI 必须使用 `frontend/tailwind.config.ts` 中定义的 token（`primary`、`secondary`、`on-surface-variant`、`outline-variant`、`surface-container-lowest` 等）；品牌专有色（微信绿 `#07C160`）无 token，用 Tailwind 任意值 `text-[#07C160]` 形式
- **设计语言**：遵循 `design/intellectual_professional/DESIGN.md`——卡片用 `1px` 边框代替阴影、主按钮实色 Navy、次按钮 ghost + 1px 边框
- **测试策略**：项目前端无单元测试框架（v1 范围），本功能**不引入**新测试框架；验证手段为 `tsc --noEmit` + `npm run build` + CDP（Chrome DevTools Protocol）浏览器自动化验证。每步的"运行验证"即该任务的测试环节
- **开发端口**：3000 常被旧 next 进程占用，dev server 启动失败时回退 `npm run dev -- -p 3001`，验证脚本用 `FRONTEND_URL` 环境变量适配
- **只改前端**：不触碰 `backend/`、数据库、Nginx 配置
- **commit 风格**：遵循现有历史，`feat(share): 中文描述` 前缀，消息末尾带 Co-Authored-By 行

---

## File Structure

| 操作 | 路径 | 职责 |
|------|------|------|
| 新增依赖 | `frontend/package.json` | `qrcode.react` ^4.2.0 |
| 新建 | `frontend/src/components/blog/WeChatShareButton.tsx` | 分享按钮 + 双形态弹窗 + 二维码 + 复制链接（自包含，零 props） |
| 修改 | `frontend/src/app/blog/[id]/page.tsx` | metadata 行插入组件（import 1 行 + JSX 1 处） |
| 临时脚本 | `/tmp/verify-wechat-share.mjs` | CDP 验证脚本（不进仓库，验证后删除） |

---

### Task 1: 安装 qrcode.react 依赖

**Files:**
- Modify: `frontend/package.json`（dependencies 新增 `qrcode.react`）

- [ ] **Step 1: 安装依赖**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
npm install qrcode.react@^4.2.0
```

- [ ] **Step 2: 验证安装成功**

```bash
node -e "console.log(require('qrcode.react/package.json').version)"
```

Expected: 输出 `4.2.x` 版本号，无报错

- [ ] **Step 3: 验证 QRCodeSVG 可导入（类型检查）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
cat > /tmp/qr-import-check.tsx <<'EOF'
import { QRCodeSVG } from 'qrcode.react';
export const check = <QRCodeSVG value="https://example.com" size={160} fgColor="#002045" level="M" />;
EOF
npx tsc --noEmit --jsx react-jsx --esModuleInterop --moduleResolution node --skipLibCheck /tmp/qr-import-check.tsx && rm /tmp/qr-import-check.tsx
```

Expected: 无输出（编译通过），临时文件被删除

- [ ] **Step 4: Commit**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(share): 安装 qrcode.react 用于微信分享二维码

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: 创建 WeChatShareButton 组件

**Files:**
- Create: `frontend/src/components/blog/WeChatShareButton.tsx`

**Interfaces:**
- Produces: 默认导出 React 组件 `WeChatShareButton`，零 props。内部渲染 `button[aria-label="分享到微信"]`、桌面 popover（含文案「微信扫码分享」）、移动模态（遮罩 `data-testid="wechat-share-overlay"`）、二维码容器 `data-testid="wechat-share-qr"`、复制链接按钮（成功后文案「已复制」）。Task 3 在文章页 metadata 行以 `<WeChatShareButton />` 消费；Task 5 CDP 脚本依赖上述 aria-label / data-testid 选择器。

- [ ] **Step 1: 编写组件完整代码**

创建 `frontend/src/components/blog/WeChatShareButton.tsx`：

```tsx
'use client';

// =============================================================================
// WeChatShareButton — 文章微信分享按钮
// =============================================================================
// 点击微信图标弹出二维码：桌面端为贴近图标的 popover，移动端为居中模态。
// 二维码内容为当前页面 URL（window.location.href），微信扫码即可在微信内
// 打开文章并转发给好友/朋友圈。附带「复制链接」作为非微信场景补充。
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaWeixin, FaTimes, FaLink, FaCheck } from 'react-icons/fa';

/** 微信品牌绿（设计系统 token 之外的品牌专有色） */
const WECHAT_GREEN = '#07C160';

/**
 * 二维码容器四角的取景框角标（L 形，微信绿），呼应"扫一扫"动作
 */
function CornerMark({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positionClass = {
    tl: 'top-0 left-0 border-t-[3px] border-l-[3px]',
    tr: 'top-0 right-0 border-t-[3px] border-r-[3px]',
    bl: 'bottom-0 left-0 border-b-[3px] border-l-[3px]',
    br: 'bottom-0 right-0 border-b-[3px] border-r-[3px]',
  }[position];
  return (
    <span
      aria-hidden
      className={`absolute w-4 h-4 border-[#07C160] ${positionClass} pointer-events-none`}
    />
  );
}

/**
 * 微信分享按钮（自包含，零 props）
 *
 * - 桌面（≥sm）：图标旁弹出 popover，右对齐防止越界
 * - 移动（<sm）：居中模态 + 半透明遮罩，附截图识别提示
 * - 关闭方式：点击外部 / Esc / × 按钮 / 遮罩
 */
export default function WeChatShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [clipboardOk, setClipboardOk] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 客户端 mount 后取当前文章 URL 作为二维码内容
  // （初始为 null，避免 SSR 与首帧 hydration 不一致）
  useEffect(() => {
    setUrl(window.location.href);
    setClipboardOk(!!navigator.clipboard);
  }, []);

  // 弹窗打开时：Esc 关闭 + 点击组件外部关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [open]);

  // 卸载时清理「已复制」反馈定时器
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // 非安全上下文 clipboard 不可用；clipboardOk 为 false 时按钮已隐藏，此处兜底忽略
    }
  };

  // ------------------------------------------------------------------
  // 弹窗卡片内容（桌面 popover 与移动模态共用）
  // ------------------------------------------------------------------
  const shareCard = url && (
    <div className="w-[240px] rounded-lg border border-outline-variant bg-surface-container-lowest p-5">
      {/* 顶栏：微信绿图标 + 标题 + 关闭按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaWeixin size={16} className="text-[#07C160] flex-shrink-0" />
          <span className="font-display text-[15px] font-semibold text-primary">
            微信扫码分享
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="关闭分享弹窗"
          className="p-1 rounded text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <FaTimes size={13} />
        </button>
      </div>

      {/* 二维码 + 取景框角标（Navy 前景，与品牌一致） */}
      <div
        data-testid="wechat-share-qr"
        className="relative w-fit mx-auto p-3 bg-white border border-outline-variant rounded"
      >
        <CornerMark position="tl" />
        <CornerMark position="tr" />
        <CornerMark position="bl" />
        <CornerMark position="br" />
        <QRCodeSVG value={url} size={160} fgColor="#002045" bgColor="#ffffff" level="M" />
      </div>

      {/* 文案 */}
      <p className="mt-4 text-center text-[13px] text-on-surface-variant">
        打开手机微信，扫一扫二维码
      </p>
      <p className="mt-1 text-center text-[12px] text-on-surface-variant/60">
        即可转发给好友或分享到朋友圈
      </p>

      {/* 复制链接（次按钮：ghost + 1px 边框），成功后绿色反馈 */}
      {clipboardOk && (
        <button
          type="button"
          onClick={handleCopy}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded border text-[13px] font-medium transition-colors ${
            copied
              ? 'border-secondary text-secondary bg-secondary-container/30'
              : 'border-outline-variant text-primary hover:bg-surface-container'
          }`}
        >
          {copied ? <FaCheck size={13} /> : <FaLink size={13} />}
          {copied ? '已复制' : '复制链接'}
        </button>
      )}

      {/* 移动端附加提示（桌面隐藏） */}
      <p className="mt-3 text-center text-[12px] text-on-surface-variant/60 sm:hidden">
        也可截图后，在微信扫一扫中从相册识别
      </p>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* ---- 微信图标按钮（分隔线 + 圆形 hover 底） ---- */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="分享到微信"
        aria-expanded={open}
        title="分享到微信"
        className="group flex items-center"
      >
        <span aria-hidden className="w-px h-4 bg-outline-variant/60 mr-3" />
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 ${
            open ? 'bg-[#07C160]/10' : 'group-hover:bg-[#07C160]/10'
          }`}
        >
          <FaWeixin
            size={18}
            className={`text-[#07C160] transition-transform duration-150 ${
              open ? 'scale-110' : 'group-hover:scale-110'
            }`}
          />
        </span>
      </button>

      {/* ---- 桌面 popover（≥sm）：图标正下方右对齐，带上指箭头 ---- */}
      <div
        className={`hidden sm:block absolute right-0 top-full mt-3 z-40 origin-top-right transition-all duration-150 ease-out ${
          open
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-1 scale-[0.98] pointer-events-none'
        }`}
      >
        <span
          aria-hidden
          className="absolute -top-1.5 right-4 w-3 h-3 rotate-45 border-l border-t border-outline-variant bg-surface-container-lowest"
        />
        {shareCard}
      </div>

      {/* ---- 移动模态（<sm）：半透明遮罩 + 居中卡片 ---- */}
      <div
        className={`sm:hidden fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          data-testid="wechat-share-overlay"
          className="absolute inset-0 bg-primary/40"
          onClick={() => setOpen(false)}
        />
        <div
          className={`relative transition-transform duration-200 ${
            open ? 'scale-100' : 'scale-95'
          }`}
        >
          {shareCard}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 类型检查**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
npx tsc --noEmit
```

Expected: 无输出（无类型错误）

- [ ] **Step 3: Commit**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/components/blog/WeChatShareButton.tsx
git commit -m "feat(share): 新增微信分享按钮组件

二维码编码当前文章 URL，桌面 popover / 移动居中模态双形态，
附复制链接与复制成功反馈，遵循 DESIGN.md 边框卡片风格

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 集成到文章详情页

**Files:**
- Modify: `frontend/src/app/blog/[id]/page.tsx`（import 区 + metadata 行）

**Interfaces:**
- Consumes: Task 2 产出的默认导出组件 `WeChatShareButton`（零 props）

- [ ] **Step 1: 添加 import**

在 `frontend/src/app/blog/[id]/page.tsx` 的 import 区（`import Footer from '@/components/layout/Footer';` 之后）添加一行：

```tsx
import WeChatShareButton from '@/components/blog/WeChatShareButton';
```

- [ ] **Step 2: 在 metadata 行末尾插入组件**

在同一文件中找到 metadata 行的「Date」项（末尾是 `{formatDate(article.publishDate || article.createdAt)}` 的 div），将该 div 连同其后的闭合标签：

```tsx
                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-display text-[13px] text-on-surface-variant">
                      {formatDate(article.publishDate || article.createdAt)}
                    </span>
                  </div>
                </div>
```

替换为（在 date div 后新增微信分享项，行闭合标签不变）：

```tsx
                  {/* Date */}
                  <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-on-surface-variant/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-display text-[13px] text-on-surface-variant">
                      {formatDate(article.publishDate || article.createdAt)}
                    </span>
                  </div>

                  {/* WeChat share */}
                  <WeChatShareButton />
                </div>
```

- [ ] **Step 3: 类型检查**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
npx tsc --noEmit
```

Expected: 无输出

- [ ] **Step 4: Commit**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add "frontend/src/app/blog/[id]/page.tsx"
git commit -m "feat(share): 文章详情页 metadata 行接入微信分享按钮

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 生产构建验证

**Files:** 无新增修改（纯验证任务）

- [ ] **Step 1: 执行生产构建**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
npm run build
```

Expected: 构建成功，输出包含 `Compiled successfully` 或 ✓ 标记，无 TypeScript / ESLint 错误；`/blog/[id]` 路由出现在路由列表中

- [ ] **Step 2: 确认无 SSR 问题**

构建输出中不得出现 `window is not defined`、hydration 相关 warning。`WeChatShareButton` 所在页面为 `'use client'`，且 `url` / `clipboardOk` 初始值在 SSR 与首帧一致（均为 null / false），构建应干净通过。

Expected: 无相关报错或警告

- [ ] **Step 3: 若有构建错误，修复后重新构建**

常见错误及修法（仅在出现时执行）：
- `Cannot find module 'qrcode.react'` → 回到 Task 1 重新 `npm install`
- JSX/类型错误 → 按报错位置修正 `WeChatShareButton.tsx`，再跑 `npx tsc --noEmit` 与 `npm run build`

修复后以独立 commit 提交：`fix(share): 修复构建错误 — <具体内容>`

---

### Task 5: CDP 浏览器端到端验证

**Files:**
- Create（临时）: `/tmp/verify-wechat-share.mjs`（验证后删除，不进仓库）

**Interfaces:**
- Consumes: Task 2 组件暴露的选择器——`button[aria-label="分享到微信"]`、`data-testid="wechat-share-overlay"`、`data-testid="wechat-share-qr"`、文案「微信扫码分享」「已复制」「也可截图后」

**前置条件:** 前端 dev server 与后端 API 可达（文章详情页需要真实文章数据）。

- [ ] **Step 1: 准备运行环境**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
# 确认后端 API 可达（经 Next.js rewrites 代理）
curl -sf "http://localhost:3000/api/v1/articles?page=0&size=1" > /dev/null 2>&1 && echo "API_OK" || echo "API_MISSING"
```

Expected: 输出 `API_OK`。若输出 `API_MISSING`：先启动依赖服务——

```bash
# 后端 + 数据库（docker 方式，按项目部署约定）
docker compose up -d mysql backend
# 前端 dev server（3000 被占用则回退 3001）
cd frontend && (npm run dev > /tmp/next-dev.log 2>&1 &) ; sleep 5
curl -sf "http://localhost:3000/api/v1/articles?page=0&size=1" > /dev/null && echo "API_OK on 3000" || { (npm run dev -- -p 3001 > /tmp/next-dev.log 2>&1 &) ; sleep 5; echo "try 3001"; }
```

再次执行 curl 确认 `API_OK`，并记住实际端口（下文 `FRONTEND_URL` 用）。

- [ ] **Step 2: 安装 QR 解码依赖（仅验证用，不写入 package.json）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
npm install --no-save jsqr
node -e "console.log(require('jsqr/package.json').version)"
```

Expected: 输出 jsqr 版本号

- [ ] **Step 3: 编写 CDP 验证脚本**

创建 `/tmp/verify-wechat-share.mjs`：

```js
// =============================================================================
// 微信分享功能 CDP 端到端验证（无第三方 CDP 依赖，Node 22 原生 WebSocket）
// 覆盖：桌面 popover 开/关、移动模态开/关、复制链接反馈、二维码内容解码
// =============================================================================
import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEBUG_PORT = 9333;
const JSQR_SRC = readFileSync(
  '/Users/fupengfei/coding-vibe/Sean-Blog/frontend/node_modules/jsqr/dist/jsQR.js',
  'utf8',
);

let passed = 0;
function assert(cond, msg) {
  if (!cond) { console.error(`  ✗ FAIL: ${msg}`); process.exitCode = 1; }
  else { passed++; console.log(`  ✓ ${msg}`); }
}

// ---- 取一篇真实文章，构造详情页 URL ----
const listRes = await fetch(`${FRONTEND}/api/v1/articles?page=0&size=1`);
const page = await listRes.json();
const articleId = page?.data?.list?.[0]?.id ?? page?.list?.[0]?.id;
if (!articleId) { console.error('无法获取文章列表，请确认后端已启动'); process.exit(1); }
const articleUrl = `${FRONTEND}/blog/${articleId}`;
console.log(`文章 URL: ${articleUrl}\n`);

// ---- 启动 headless Chrome ----
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`,
  '--no-first-run', '--no-default-browser-check',
  '--user-data-dir=/tmp/cdp-wechat-profile', 'about:blank',
], { stdio: 'ignore' });

// ---- 极简 CDP 客户端 ----
let msgId = 0;
const pending = new Map();
let ws;
async function connect(url) {
  ws = new WebSocket(url);
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
    }
  });
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
}
function send(method, params = {}) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression, awaitPromise = false) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails.exception?.description || r.exceptionDetails));
  return r.result.value;
}
async function waitFor(expression, timeoutMs = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (await evaluate(expression)) return true;
    await sleep(300);
  }
  return false;
}
const setViewport = (w, h) =>
  send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });

try {
  // 等待 DevTools 就绪，创建 page target
  let pageWsUrl;
  for (let i = 0; i < 30 && !pageWsUrl; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
      pageWsUrl = targets.find((t) => t.type === 'page')?.webSocketDebuggerUrl;
    } catch { /* Chrome 尚未就绪 */ }
    if (!pageWsUrl) await sleep(500);
  }
  if (!pageWsUrl) throw new Error('Chrome DevTools 连接失败');
  await connect(pageWsUrl);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Browser.grantPermissions', {
    origin: FRONTEND,
    permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'],
  });

  // ===================== 桌面端（1280px）=====================
  console.log('【桌面端 1280×900】');
  await setViewport(1280, 900);
  await send('Page.navigate', { url: articleUrl });
  assert(await waitFor(`!!document.querySelector('button[aria-label="分享到微信"]')`), '文章页渲染出微信分享按钮');

  await evaluate(`document.querySelector('button[aria-label="分享到微信"]').click()`);
  assert(await waitFor(`document.body.innerText.includes('微信扫码分享')`), '点击后弹出分享卡片（标题「微信扫码分享」）');
  assert(await evaluate(`!!document.querySelector('[data-testid="wechat-share-qr"] svg')`), '二维码 SVG 已渲染');
  assert(await evaluate(`!!document.querySelector('[data-testid="wechat-share-qr"] svg path')`), '二维码含实际图形路径（非空）');
  assert(await evaluate(`!document.body.innerText.includes('也可截图后')`), '桌面端不显示移动端截图提示');

  // 二维码内容解码 === 当前文章 URL
  await evaluate(JSQR_SRC); // 注入 jsQR（UMD，挂载 window.jsQR）
  const decoded = await evaluate(`(async () => {
    const svg = document.querySelector('[data-testid="wechat-share-qr"] svg');
    const xml = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej;
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml))); });
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 4; canvas.height = img.height * 4;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const r = window.jsQR(d.data, d.width, d.height);
    return r ? r.data : null;
  })()`, true);
  assert(decoded === articleUrl, `二维码解码内容 === 文章 URL（解码值: ${decoded}）`);

  // 复制链接
  await evaluate(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('复制链接')).click()`);
  assert(await waitFor(`document.body.innerText.includes('已复制')`), '点击复制链接后出现「已复制」反馈');
  const clip = await evaluate(`navigator.clipboard.readText()`);
  assert(clip === articleUrl, '剪贴板内容 === 文章 URL');

  // Esc 关闭
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  assert(await waitFor(`!document.body.innerText.includes('微信扫码分享')`), '按 Esc 关闭弹窗');

  // 再开再点外部关闭
  await evaluate(`document.querySelector('button[aria-label="分享到微信"]').click()`);
  await waitFor(`document.body.innerText.includes('微信扫码分享')`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 10, y: 400, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 400, button: 'left', clickCount: 1 });
  assert(await waitFor(`!document.body.innerText.includes('微信扫码分享')`), '点击弹窗外部关闭');

  // ===================== 移动端（375px）=====================
  console.log('\n【移动端 375×812】');
  await setViewport(375, 812);
  await send('Page.navigate', { url: articleUrl });
  assert(await waitFor(`!!document.querySelector('button[aria-label="分享到微信"]')`), '移动端文章页渲染出分享按钮');

  await evaluate(`document.querySelector('button[aria-label="分享到微信"]').click()`);
  assert(await waitFor(`document.body.innerText.includes('微信扫码分享')`), '点击后弹出分享卡片');
  assert(await evaluate(`!!document.querySelector('[data-testid="wechat-share-overlay"]')`), '存在遮罩层（模态形态）');
  assert(await evaluate(`document.body.innerText.includes('也可截图后')`), '移动端显示截图识别提示');

  // 点遮罩关闭
  await evaluate(`document.querySelector('[data-testid="wechat-share-overlay"]').click()`);
  assert(await waitFor(`!document.body.innerText.includes('微信扫码分享')`), '点击遮罩关闭弹窗');

  console.log(`\n通过 ${passed} 项断言${process.exitCode ? '，存在失败项！' : '，全部通过 ✓'}`);
} finally {
  chrome.kill();
  rmSync('/tmp/cdp-wechat-profile', { recursive: true, force: true });
}
```

- [ ] **Step 4: 执行验证脚本**

```bash
node /tmp/verify-wechat-share.mjs
```

Expected: 依次输出桌面端、移动端各断言 `✓`，末行为 `通过 14 项断言，全部通过 ✓`，进程退出码 0。

（若 dev server 在 3001 端口：`FRONTEND_URL=http://localhost:3001 node /tmp/verify-wechat-share.mjs`）

- [ ] **Step 5: 失败时的排查路径**

仅在断言失败时执行：
- 「文章页渲染出微信分享按钮」失败 → `curl ${FRONTEND}/api/v1/articles?page=0&size=1` 检查后端数据；浏览器控制台报错用 `Runtime.evaluate('window.__err')` 或查看 `/tmp/next-dev.log`
- 「二维码解码内容」失败 → 确认 Task 2 中 `QRCodeSVG` 的 `value={url}` 未被改动，`level="M"` 存在
- Esc / 外部点击关闭失败 → 确认 Task 2 中 `useEffect` 的监听器注册与 `containerRef` 绑定完整
- 修复后重跑 Step 4，修复以 `fix(share): ...` 独立 commit

- [ ] **Step 6: 清理验证产物**

```bash
rm /tmp/verify-wechat-share.mjs
cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend
# jsqr 为 --no-save 安装，从 node_modules 移除并恢复 lock 文件状态
npm uninstall --no-save jsqr
git status --short  # 确认 package.json / package-lock.json 无 jsqr 相关变更
```

Expected: `git status` 中 package.json 与 package-lock.json 无改动（若有改动：`git checkout frontend/package.json frontend/package-lock.json`）

- [ ] **Step 7: （可选，人工）手机实测扫码**

在部署环境（或本机同网段可访问的地址）打开任一文章，点击微信图标，用手机微信「扫一扫」扫描二维码。

Expected: 文章在微信内置浏览器中打开，右上角菜单可转发给好友 / 分享到朋友圈

---

## Self-Review

**Spec 覆盖检查**（对照 `docs/superpowers/specs/2026-07-28-wechat-share-design.md`）：

| Spec 条目 | 实现任务 |
|-----------|---------|
| §3.1 前端 qrcode.react + QRCodeSVG + SSR 安全 | Task 1、Task 2（url 初始 null，mount 后赋值） |
| §3.2 编码 window.location.href + localhost 已知限制 | Task 2（`setUrl(window.location.href)`）、Task 5（jsQR 解码断言内容 === 文章 URL） |
| §3.3 react-icons FaWeixin | Task 2 |
| §4.1 组件三个 state + Esc/外部点击关闭 + 复制链接 1.5s 复位 + 清理监听器/定时器 | Task 2（open/copied/url + clipboardOk，useEffect 清理完整） |
| §4.2 metadata 行插入 | Task 3 |
| §5.1 图标按钮：36px 圆形、hover 浅绿底 + scale、分隔线、aria | Task 2 |
| §5.2 卡片六段结构（顶栏/QR+角标/主副文案/复制按钮/移动提示）+ Navy QR + 取景框角标 | Task 2（CornerMark + shareCard） |
| §5.3 桌面 popover（右对齐+箭头+动画）/ 移动模态（遮罩+动画）/ sm: 类切换 | Task 2 |
| §5.4 白底 1px 边框 rounded-lg p-5 | Task 2 |
| §6 文件变更清单 | File Structure 一致（package.json / 组件 / 页面） |
| §7 YAGNI（不做 JS-SDK / 统计 / 其他平台 / 短链 / 列表页入口） | 计划未包含任何相关任务 |
| §8 验证计划四项 | Task 4（build）+ Task 5（CDP 桌面/移动/复制/QR 解码）+ Step 7 人工扫码 |

**Placeholder 扫描**：无 TBD/TODO；所有代码步骤含完整代码；所有命令含预期输出。

**类型/命名一致性**：组件默认导出名 `WeChatShareButton` 在 Task 2/3 一致；选择器 `aria-label="分享到微信"`、`data-testid="wechat-share-overlay"`、`data-testid="wechat-share-qr"` 在 Task 2 定义、Task 5 消费，完全一致；文案「微信扫码分享」「已复制」「也可截图后」跨任务一致。
