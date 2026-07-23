# 首页上线公告横幅（Announcement Banner）设计文档

- **日期**：2026-07-23
- **状态**：待实现
- **范围**：仅前端，不涉及后端与数据库

## 1. 背景与目标

Sean's AI 智能助手（结合 RAG 知识检索 + Function Call + Skill 编排）已顺利上线，但助手目前只有全局浮动 ChatWidget 入口，无独立页面，用户感知度低。

在首页顶部增加一条 DeepSeek 平台风格的通知横幅：

1. 庆祝并公告助手上线
2. 提供零步体验路径——点击即打开助手聊天窗
3. 可关闭、关闭状态持久化，不造成长期打扰

## 2. 方案概览

| 决策点 | 选择 | 理由 |
|--------|------|------|
| 挂载位置 | `frontend/src/app/page.tsx` 中 `<NavBar />` 之前 | NavBar 是 `sticky top-0`；横幅置于文档流上方，滚动时自然消失（DeepSeek 同款行为），无需改动 NavBar |
| 展示范围 | 仅首页（v1） | 用户需求明确为「网站首页顶部」；组件独立，将来如需全站展示可轻松移入 layout |
| 组件形态 | 新建 `frontend/src/components/layout/AnnouncementBanner.tsx`，`'use client'` | 需要 localStorage 与 `useChat()`，必须为客户端组件；与 NavBar / Footer 同目录同级 |
| 点击行为 | 整条横幅可点击 → `useChat().openChat()` | ChatProviderWrapper 已在 `layout.tsx` 包裹全站（Admin 除外），首页必然在 Provider 内；助手无独立页面，直达聊天窗体验最短 |
| 关闭行为 | 右侧 × 按钮 → 写入 localStorage `sean_announcement_dismissed_v1` | 版本号后缀 `_v1`：将来更换公告内容时升级版本号即可重新触达所有用户 |

## 3. 视觉设计

遵循 `design/intellectual_professional/DESIGN.md`「quiet UI、克制用色、轻描边、8px 间距体系」，在品牌基调内做出庆祝感：

### 3.1 布局结构

```
┌────────────────────────────────────────────────────────────────────┐
│  ✨ [NEW]  Sean's AI 智能助手正式上线！ 融合 RAG 知识检索 · Function │
│            Call · Skill 编排三大能力              [ 立即体验 → ]  × │
└────────────────────────────────────────────────────────────────────┘
```

- 全宽横幅，内容区 `max-w-[1200px] mx-auto`，垂直内边距统一 8px（设计系统 8px 倍数体系），元素间距 8px / 16px
- 左侧：sparkle 图标 + 绿色 `NEW` 徽章 + 主文案
- 右侧：白描边小按钮「立即体验」+ 箭头，最右为 × 关闭按钮

### 3.2 配色（全部使用既有 Tailwind token）

| 元素 | 样式 |
|------|------|
| 背景 | Navy 同色系渐变：`primary`(#002045) → `primary-container`(#1a365d)；左端叠加一层极低透明度绿色径向光晕（呼应 NEW 徽章），形成低调的环境光层次 |
| 主文案 | 白色；「正式上线」部分用 `font-semibold` 加重，能力列表用 `text-white/75` 常规字重，形成字重对比 |
| NEW 徽章 | `secondary`(#0a6c44) 背景 + 白字，圆角 4px（设计系统 soft 档），带柔和呼吸脉冲（opacity 0.7↔1，周期 ~2.4s） |
| 「立即体验」按钮 | 透明底 + `1px solid rgba(255,255,255,0.35)` 描边 + 白字；hover 时底变 `white/10`、箭头右移 2px |
| × 关闭按钮 | 白色 60% 透明 SVG 图标，hover 提升至 100%，`transition-colors duration-200` |

### 3.3 动效（克制，符合 quiet UI）

| 动效 | 参数 |
|------|------|
| 入场 | 客户端决定展示后，从顶部滑入（`translateY(-100%) → 0` + `opacity 0 → 1`），`300ms ease-out` |
| 退场（关闭） | 淡出 + 轻微上移，`200ms`，动画结束后卸载 |
| 流光 | 一条低透明度（~6%）白色渐变光带每 6s 缓慢横扫一次，营造「庆祝上线」的活性，不喧宾夺主 |
| 横幅 hover | 背景亮度轻微提升（叠加 `white/[0.03]`），暗示可点击 |
| 全局 | 尊重 `prefers-reduced-motion`：减弱时禁用流光与呼吸脉冲 |

## 4. 文案

> ✨ **NEW**　Sean's AI 智能助手**正式上线**！融合 RAG 知识检索 · Function Call · Skill 编排三大能力　[立即体验 →]

- 主文案「Sean's AI 智能助手正式上线！」`font-semibold`
- 能力说明「融合 RAG 知识检索 · Function Call · Skill 编排三大能力」常规字重、75% 白
- 移动端（`<sm`）：文案自然换行，按钮保留「立即体验」四字

## 5. 状态与数据流

```
mount → useEffect 读 localStorage 'sean_announcement_dismissed_v1'
  ├─ 已关闭 → 永不渲染
  └─ 未关闭 → 渲染 + 播放入场动画

点击横幅/按钮 → e.preventDefault → useChat().openChat()
点击 ×      → stopPropagation → 播放退场动画 → 写 localStorage → 卸载
```

### SSR 处理

服务端渲染**不输出横幅**（`visible` 初始为 `false`），客户端 `useEffect` 中读取 localStorage 后再决定展示。

- 未关闭用户：入场动画天然掩盖了 mount 延迟，无感知跳变
- 已关闭用户：永远不出现，无「闪现后消失」的坏体验

## 6. 无障碍

- 横幅容器 `role="region" aria-label="上线公告"`
- 整条横幅用 `<div role="button" tabIndex={0}>` 承载点击（不用 `<button>`，避免与内部 × 按钮形成非法嵌套），支持 Enter/Space 键盘触发
- × 按钮 `aria-label="关闭公告"`，点击时 `stopPropagation` 防止触发外层打开聊天
- NEW 徽章 `aria-hidden`（语义已包含在文案中）

## 7. 文件变更清单

| 操作 | 文件 |
|------|------|
| 新建 | `frontend/src/components/layout/AnnouncementBanner.tsx` |
| 修改 | `frontend/src/app/page.tsx`（在 `<NavBar />` 前插入 `<AnnouncementBanner />`） |

## 8. 验收标准

1. `npm run build` 编译通过，无 TypeScript / ESLint 错误
2. 首页顶部出现公告横幅，NavBar 正常吸顶不受影响（横幅滚动后消失，NavBar 保持 sticky）
3. 点击横幅任意位置（× 除外）→ ChatWidget 聊天面板打开
4. 点击 × → 横幅淡出消失；刷新页面不再出现
5. 清空 localStorage 中对应 key → 横幅重新出现
6. 移动端（375px 宽）文案正常换行、按钮与 × 可点、无横向滚动
7. 开启系统「减弱动态效果」→ 无流光与呼吸动画
