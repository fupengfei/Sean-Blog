# 首页上线公告横幅 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在首页顶部增加一条 DeepSeek 平台风格的公告横幅，庆祝 Sean's AI 智能助手（RAG + Function Call + Skill）上线，点击即打开助手聊天窗，可关闭且状态持久化。

**Architecture:** 新建客户端组件 `AnnouncementBanner`，挂载在首页 `page.tsx` 的 `<NavBar />` 之前（NavBar 是 `sticky top-0`，横幅在文档流中、滚动即消失）。横幅通过 `useChat().openChat()` 打开全局 ChatWidget；关闭状态存入带版本号的 localStorage key；服务端不渲染，客户端判定未关闭后播放滑入动画。

**Tech Stack:** Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS 3.4（既有 design token：`primary`/`primary-container`/`secondary`/`on-primary`/`on-secondary`）

## Global Constraints

- 设计遵循 `design/intellectual_professional/DESIGN.md`：quiet UI、只用既有 Tailwind token（禁止硬编码色值）、间距 8px 倍数、圆角 soft 档（4px）
- **测试约定**：本项目前端无任何测试框架（`package.json` 无 test script、无 jest/vitest），遵循现有模式，以 `npm run build`（TS 严格编译 + Next.js 检查）+ dev server 手工验收代替单元测试，不引入新测试基建（YAGNI）
- 图标使用内联 SVG（heroicons outline 风格，`stroke="currentColor"`），与 NavBar / ChatPanel 现有惯例一致，不引入 react-icons
- 所有间距（margin/padding/gap）为 8px 倍数；徽章内部 2px 衬垫属于排版细节除外
- 尊重 `prefers-reduced-motion`：流光与呼吸脉冲用 `motion-reduce:animate-none` 关闭
- Commit 格式遵循 Conventional Commits（见 sean-dev-standards）；执行 commit 步骤前先与用户确认
- 规格文档：`docs/superpowers/specs/2026-07-23-home-announcement-banner-design.md`

## File Structure

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `frontend/tailwind.config.ts` | 在 `theme.extend` 增加 `banner-sheen` / `banner-pulse` 两组 keyframes + animation token |
| 新建 | `frontend/src/components/layout/AnnouncementBanner.tsx` | 公告横幅组件：展示判定、入场/退场动画、点击打开聊天、关闭持久化、无障碍 |
| 修改 | `frontend/src/app/page.tsx` | 在 `<NavBar />` 前插入 `<AnnouncementBanner />`，更新页面结构注释 |

---

## Task 1: 增加动画 token 并创建 AnnouncementBanner 组件

**Files:**
- Modify: `frontend/tailwind.config.ts`（`theme.extend` 内，`fontFamily` 块之后追加 `keyframes` 与 `animation`）
- Create: `frontend/src/components/layout/AnnouncementBanner.tsx`

**Interfaces:**
- Consumes: `useChat()` 来自 `@/components/chat/ChatProvider`（签名：`openChat: () => void`，见 `ChatProvider.tsx:29`）；Tailwind token `primary`(#002045)、`primary-container`(#1a365d)、`secondary`(#0a6c44)、`on-primary`(#ffffff)、`on-secondary`(#ffffff)
- Produces: 默认导出组件 `AnnouncementBanner`（无 props），供 Task 2 在首页引用

- [ ] **Step 1: 在 tailwind.config.ts 增加 keyframes 与 animation token**

在 `frontend/tailwind.config.ts` 的 `theme.extend` 中，`fontFamily` 块（第 55-59 行）之后追加：

```ts
      // -----------------------------------------------------------------------
      // 动画系统：公告横幅专用
      // banner-sheen: 低透明度光带扫过（前 25% 时间扫完，其余时间停顿，6s 一轮）
      // banner-pulse: NEW 徽章柔和呼吸脉冲
      // -----------------------------------------------------------------------
      keyframes: {
        'banner-sheen': {
          '0%': { transform: 'translateX(-100%) skewX(-12deg)' },
          '25%, 100%': { transform: 'translateX(350%) skewX(-12deg)' },
        },
        'banner-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      animation: {
        'banner-sheen': 'banner-sheen 6s ease-in-out infinite',
        'banner-pulse': 'banner-pulse 2.4s ease-in-out infinite',
      },
```

注意：skew 必须写在 keyframes 的 transform 内（animation 的 transform 会覆盖 class 上的 `-skew-x-12`）。

- [ ] **Step 2: 创建 AnnouncementBanner.tsx**

创建 `frontend/src/components/layout/AnnouncementBanner.tsx`：

```tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useChat } from '@/components/chat/ChatProvider';

// ---------------------------------------------------------------------------
// 首页上线公告横幅（Announcement Banner）
//
// 庆祝 Sean's AI 智能助手（RAG + Function Call + Skill）顺利上线：
// - 点击横幅任意位置 → useChat().openChat() 打开助手聊天面板
// - × 关闭 → 写入 localStorage（key 带版本号，将来换公告升级版本号可重新触达）
// - 服务端不渲染（localStorage 仅客户端可读）；客户端判定未关闭后播放滑入动画
// ---------------------------------------------------------------------------

/** localStorage key：更换公告内容时升级版本号（_v1 → _v2）即可重新触达 */
const STORAGE_KEY = 'sean_announcement_dismissed_v1';

/** 退场动画时长（ms），与下方 duration-200 保持一致 */
const EXIT_DURATION = 200;

export default function AnnouncementBanner() {
  const { openChat } = useChat();

  /** 是否展示（客户端读取 localStorage 后确定，服务端恒为 false） */
  const [visible, setVisible] = useState(false);
  /** 入场动画是否已触发（渲染后下一帧置 true，使 transition 从隐藏态开始） */
  const [entered, setEntered] = useState(false);
  /** 是否正在播放退场动画 */
  const [closing, setClosing] = useState(false);

  // 客户端挂载后读取 localStorage，决定是否需要展示
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  // visible 后等待两帧再触发入场动画，确保浏览器已绘制初始（隐藏）状态
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  /** 键盘操作支持（role="button" 需支持 Enter / Space） */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openChat();
    }
  };

  /** 关闭公告：播放退场动画后写入 localStorage 并卸载 */
  const handleDismiss = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setClosing(true);
    window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setVisible(false);
    }, EXIT_DURATION);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="上线公告"
      className={[
        'relative overflow-hidden bg-gradient-to-r from-primary to-primary-container',
        'transition-all ease-out',
        closing ? 'duration-200' : 'duration-300',
        entered && !closing ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0',
      ].join(' ')}
    >
      {/* 左端绿色环境光晕：呼应 NEW 徽章，低调的光层次 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-secondary/25 blur-3xl"
      />

      {/* 流光：低透明度白色光带缓慢扫过（减弱动态效果时关闭） */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-banner-sheen bg-gradient-to-r from-transparent via-white/[0.06] to-transparent motion-reduce:animate-none" />
      </span>

      {/* 整条横幅可点击：div + role="button"（避免与内部 × 按钮形成非法嵌套） */}
      <div
        role="button"
        tabIndex={0}
        onClick={openChat}
        onKeyDown={handleKeyDown}
        aria-label="打开 Sean's AI 智能助手"
        className={[
          'group relative mx-auto flex w-full max-w-[1200px] cursor-pointer flex-wrap items-center',
          'justify-center gap-2 px-4 py-2 pr-10 sm:justify-start sm:gap-4 sm:px-6 sm:pr-12 lg:px-10',
          'transition-colors duration-200 hover:bg-on-primary/[0.03]',
          'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-on-primary/70',
        ].join(' ')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4 shrink-0 text-on-primary/90"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
          />
        </svg>

        <span
          aria-hidden
          className="shrink-0 animate-banner-pulse rounded bg-secondary px-2 py-0.5 text-xs font-semibold leading-4 text-on-secondary motion-reduce:animate-none"
        >
          NEW
        </span>

        <p className="text-center text-sm leading-5 text-on-primary sm:text-left">
          <span className="font-semibold">Sean's AI 智能助手正式上线！</span>
          <span className="text-on-primary/75">
            {' '}
            融合 RAG 知识检索 · Function Call · Skill 编排三大能力
          </span>
        </p>

        <span className="inline-flex shrink-0 items-center gap-1 rounded border border-on-primary/35 px-3 py-1 text-xs font-medium text-on-primary transition-colors duration-200 group-hover:border-on-primary/60 group-hover:bg-on-primary/10">
          立即体验
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </span>
      </div>

      {/* 关闭按钮 */}
      <button
        type="button"
        aria-label="关闭公告"
        onClick={handleDismiss}
        className={[
          'absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-on-primary/60 sm:right-4',
          'transition-colors duration-200 hover:text-on-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-on-primary/70',
        ].join(' ')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 3: 编译验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npx tsc --noEmit`
Expected: 无输出（无类型错误）

说明：组件尚未接入页面，此步只验证文件自身类型正确。

- [ ] **Step 4: Commit（执行前先与用户确认）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/tailwind.config.ts frontend/src/components/layout/AnnouncementBanner.tsx
git commit -m "feat(frontend): 新增首页上线公告横幅组件

庆祝 Sean's AI 智能助手（RAG + Function Call + Skill）上线：
- AnnouncementBanner 客户端组件，点击打开 AI 助手聊天窗
- 关闭状态持久化（版本号 key），入场滑入/退场淡出动画
- tailwind 增加 banner-sheen / banner-pulse 动画 token"
```

---

## Task 2: 接入首页

**Files:**
- Modify: `frontend/src/app/page.tsx`

**Interfaces:**
- Consumes: Task 1 产出的默认导出组件 `AnnouncementBanner`（无 props）

- [ ] **Step 1: 修改 page.tsx**

`frontend/src/app/page.tsx` 改为：

```tsx
import AnnouncementBanner from '@/components/layout/AnnouncementBanner';
import NavBar from '@/components/layout/NavBar';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProjects from '@/components/home/FeaturedProjects';
import FeaturedArticles from '@/components/home/FeaturedArticles';
import ContactSection from '@/components/about/ContactSection';

/**
 * 首页（/）
 *
 * 页面结构：AnnouncementBanner + NavBar + HeroSection + FeaturedProjects + FeaturedArticles + ContactSection + Footer
 *
 * 特点：
 * - 纯展示型页面，无需数据请求（各子组件内部自行拉取数据）
 * - 服务端组件，无客户端交互
 * - 每个 Section 为独立组件，便于维护和复用
 * - AnnouncementBanner 为客户端组件（use client），置于 sticky NavBar 之前的文档流中，滚动即消失
 */
export default function HomePage() {
  return (
    <>
      <AnnouncementBanner />
      <NavBar />
      <main>
        <HeroSection />
        <FeaturedProjects />
        <FeaturedArticles />
        <ContactSection />
      </main>
      <Footer />
    </>
  );
}
```

变更点：① 顶部新增 import；② `<NavBar />` 前插入 `<AnnouncementBanner />`；③ JSDoc 页面结构说明同步更新。

- [ ] **Step 2: 生产构建验证**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run build`
Expected: 构建成功，无 TypeScript / ESLint 错误；首页路由 `/` 出现在输出路由表中

- [ ] **Step 3: Commit（执行前先与用户确认）**

```bash
cd /Users/fupengfei/coding-vibe/Sean-Blog
git add frontend/src/app/page.tsx
git commit -m "feat(home): 首页顶部接入 AI 助手上线公告横幅

AnnouncementBanner 置于 NavBar 之前的文档流中：
滚动页面时横幅消失，NavBar 保持 sticky 吸顶不受影响。"
```

---

## Task 3: Dev Server 端到端验收

**Files:** 无文件变更

- [ ] **Step 1: 启动 dev server**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run dev`（后台运行）
Expected: `Ready in ...`，监听 3000 端口

- [ ] **Step 2: 按验收清单逐项检查**

在浏览器打开 `http://localhost:3000`，对照 spec 第 8 节验收标准：

1. 首页顶部出现公告横幅：Navy 渐变底、绿色 NEW 徽章呼吸脉冲、流光每 6s 扫过一次
2. 向下滚动：横幅随文档流消失，NavBar 保持 `sticky top-0` 吸顶
3. 点击横幅文案/「立即体验」→ ChatWidget 聊天面板打开
4. Tab 聚焦横幅后按 Enter → 同样打开聊天面板（键盘可达性）
5. 点击 × → 横幅 200ms 淡出；刷新页面不再出现（DevTools Application → Local Storage 可见 `sean_announcement_dismissed_v1`）
6. 删除该 localStorage key 后刷新 → 横幅带滑入动画重新出现
7. 375px 视口：文案自然换行居中，「立即体验」与 × 可点击，无横向滚动
8. 系统开启「减弱动态效果」→ 流光与 NEW 脉冲静止

- [ ] **Step 3: 停止 dev server**

Run: `cd /Users/fupengfei/coding-vibe/Sean-Blog/frontend && npm run stop`
Expected: 输出「已清理端口 3000」
