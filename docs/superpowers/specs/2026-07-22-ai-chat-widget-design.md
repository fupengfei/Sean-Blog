# 智能客服对话组件 设计文档

> **日期**：2026-07-22
> **状态**：待实现
> **关联**：后端 `GET /api/v1/ai/chat`（DeepSeek v4-pro，SSE 流式响应）

---

## 一、需求概述

在博客前台所有公开页面增加智能客服功能——右下角浮动按钮 + 展开对话面板，AI 助手定位为博客专属助手（系统预设 prompt 由后端控制）。

### 决策记录

| 维度 | 决策 | 理由 |
|------|------|------|
| 覆盖范围 | 仅公开页面，Admin 不显示 | Admin 有独立布局，无需 AI 助手 |
| 展示形态 | 右下角浮动圆按钮 + 侧边滑出面板 | 类似 Intercom 风格，不占页面空间 |
| 角色定位 | 博客专属助手（后端 system prompt） | 前端只传用户消息，不拼接 prompt |
| 跨页状态 | 导航保持，刷新清空 | Context 在客户端路由中不卸载 |
| 架构方案 | RootLayout Context Provider | 一次挂载覆盖所有页面，零页面改动 |

---

## 二、组件架构

### 2.1 组件树

```
src/app/layout.tsx (server component)
└── <ChatProviderWrapper />   ← 'use client' 边界
    └── <ChatProvider />       ← React Context（状态 + SSE 请求逻辑）
        ├── <ChatWidget />     ← UI 容器（浮动按钮 + 面板开闭动画）
        │   ├── <ChatButton />     ← 右下角浮动圆形按钮
        │   └── <ChatPanel />      ← 对话面板
        │       ├── Header         ← 标题 + 关闭按钮
        │       ├── <MessageList />    ← 消息列表 + 自动滚动
        │       │   └── <MessageBubble /> ← 单条气泡
        │       └── <ChatInput />   ← 输入框 + 发送按钮
        ├── <PageViewTracker />
        └── {children}
```

### 2.2 组件职责

| 组件 | 文件 | 职责 |
|------|------|------|
| `ChatProviderWrapper` | `components/chat/ChatProviderWrapper.tsx` | `'use client'` 边界。通过 `usePathname()` 判断是否 `/admin/*`，是则不渲染 `ChatProvider` |
| `ChatProvider` | `components/chat/ChatProvider.tsx` | React Context Provider。管理 `messages[]`、`isOpen`、`isStreaming`，暴露 `sendMessage()`、`closeChat()`。SSE 流通过 `fetch` + `ReadableStream` 读取 |
| `ChatWidget` | `components/chat/ChatWidget.tsx` | 纯 UI 容器。组装浮动按钮 + 面板，处理打开/关闭动画 |
| `ChatButton` | `components/chat/ChatButton.tsx` | 56x56 圆形 Navy 按钮，聊天气泡 / X 图标切换 |
| `ChatPanel` | `components/chat/ChatPanel.tsx` | 对话面板外壳（Header + MessageList + InputBar），响应式（桌面 380x520，移动端全屏） |
| `MessageList` | `components/chat/MessageList.tsx` | 消息列表，新消息 `scrollIntoView` |
| `MessageBubble` | `components/chat/MessageBubble.tsx` | 单条消息。用户：右对齐浅灰背景。AI：左对齐纯文字（支持 Markdown） |
| `ChatInput` | `components/chat/ChatInput.tsx` | 输入框 + 发送按钮。空消息 disabled，流式中 disabled |

### 2.3 状态管理（ChatProvider Context）

```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface ChatContextValue {
  messages: ChatMessage[];
  isOpen: boolean;
  isStreaming: boolean;
  openChat: () => void;
  closeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
}
```

- 初始化时 `messages` 包含一条 `role: 'assistant'` 的欢迎消息
- `sendMessage` 内部使用 `useRef<AbortController>` 管理 SSE 连接
- 关闭面板时如果正在流式输出，abort 当前请求
- 不持久化，刷新页面后恢复初始状态

---

## 三、数据流

### 3.1 发送消息流程

```
用户输入 → sendMessage(text)
  1. 追加 { role: 'user', content: text } 到 messages
  2. 追加 { role: 'assistant', content: '' } 占位消息到 messages
  3. 设置 isStreaming = true
  4. fetch('GET /api/v1/ai/chat?message={encodeURIComponent(text)}')
     → 读取 ReadableStream
     → 每收到 chunk，追加到占位消息的 content
     → 流结束：设置 isStreaming = false
  5. 错误：在占位消息 content 末尾追加错误提示
```

### 3.2 SSE 流读取（伪代码）

```typescript
const response = await fetch(`/api/v1/ai/chat?message=${encodeURIComponent(text)}`);
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // 追加到当前 assistant 消息
}
```

### 3.3 取消请求

```typescript
// ChatProvider 内部
const abortRef = useRef<AbortController | null>(null);

// sendMessage 中
abortRef.current?.abort();
abortRef.current = new AbortController();
fetch(url, { signal: abortRef.current.signal });

// closeChat 中
if (isStreaming) abortRef.current?.abort();
```

---

## 四、UI 规格

### 4.1 浮动按钮

| 属性 | 值 |
|------|-----|
| 尺寸 | 56x56px 圆形 |
| 位置 | `fixed bottom-6 right-6` |
| 背景 | `bg-primary`（Navy #002045） |
| 图标 | 收起时 💬，展开时 ✕ |
| Hover | `bg-primary-container` + `shadow-[0px_4px_12px_rgba(0,0,0,0.05)]` |
| z-index | `z-50` |

### 4.2 对话面板

| 属性 | 桌面 (≥768px) | 移动 (<768px) |
|------|-------------|-------------|
| 宽度 | 380px | 100vw |
| 高度 | 520px | 100dvh |
| 圆角 | 8px（`rounded-lg`） | 无 |
| 边框 | `1px solid border-outline-variant` | 无 |
| 位置 | 右下角浮动 | 全屏覆盖 |
| z-index | `z-40` | `z-40` |

### 4.3 面板内部结构

```
┌─────────────────────────────┐
│ 🤖 Sean's AI 助手      ✕   │  Header: h-14, bg-primary, text-white
├─────────────────────────────┤
│                             │
│  [欢迎消息 / 对话历史]       │  MessageList: flex-1, overflow-y-auto
│                             │  px-4 py-3, flex flex-col gap-3
│                             │
├─────────────────────────────┤
│ ┌─────────────────────┐ 📤  │  InputBar: h-12, border-t, px-3
│ │ 输入你的问题...       │    │
│ └─────────────────────┘     │
└─────────────────────────────┘
```

### 4.4 消息气泡

| 角色 | 对齐 | 样式 |
|------|------|------|
| 用户 | 右 | `bg-surface-container-low`，`rounded-lg`，`px-3 py-2`，`max-w-[80%]` |
| AI | 左 | 无背景，纯文字，`px-3 py-2`，`max-w-[85%]` |
| 系统/错误 | 中 | `text-xs text-error`，居中 |

- 字体：`ui-small`（Inter 14px）
- AI 消息用 `react-markdown` 轻量渲染（加粗、链接、行内代码、代码块）
- 流式输出末尾显示闪烁光标 `▊`（CSS `animate-pulse`）

### 4.5 欢迎消息

首次打开面板时，`messages` 初始化包含以下 AI 消息：

```
👋 你好！我是 Sean's AI 助手，可以问我关于：
- Sean 的技术栈和专业领域
- 博客文章和项目推荐
- 前端 / 后端 / AI 相关技术问题

有什么可以帮你的？
```

### 4.6 动画

| 触发 | 效果 |
|------|------|
| 面板打开 | `translateY(0) opacity(1)` 从 `translateY(16px) opacity(0)`，300ms ease-out |
| 面板关闭 | 反向过渡，200ms ease-in |
| 按钮图标切换 | `rotate(90deg)` + opacity 交叉淡入淡出，200ms |
| 消息出现 | 自然追加，无动画（避免流式输出时跳动） |
| 新消息滚动 | `scrollIntoView({ behavior: 'smooth' })` |

### 4.7 设计令牌使用

| 元素 | 设计令牌 |
|------|---------|
| 按钮背景 | `primary`（`#002045`） |
| 按钮 hover | `primary-container`（`#1a365d`） |
| 面板背景 | `surface`（`#f9f9ff`） |
| 面板边框 | `outline-variant`（`#c4c6cf`） |
| Header 文字 | `on-primary`（`#ffffff`） |
| 用户气泡 | `surface-container-low`（`#f1f3ff`） |
| 输入框文字 | `on-surface`（`#161c27`） |
| Placeholder | `outline`（`#74777f`） |
| 字体 | Inter（`font-ui`） |
| 圆角 | `rounded-lg`（8px）面板 / `rounded-full` 按钮 |

---

## 五、错误处理

| 场景 | 处理策略 |
|------|---------|
| 网络断开 / 超时 | 当前 AI 消息末尾追加 `⚠️ 网络连接失败，请稍后重试`（红色文字） |
| SSE 流中断 | 追加 `⚠️ 响应中断`，已接收内容保留 |
| HTTP 5xx | 追加 `⚠️ 服务暂时不可用，请稍后重试` |
| 空消息提交 | 发送按钮 `disabled`（灰色不可点击） |
| 流式中再次发送 | 发送按钮 `disabled`，不可发送 |
| 关闭面板时流式中 | abort 当前请求，已接收内容保留 |
| 导航时流式中 | abort 当前请求，内容保留（Context 不销毁） |
| 移动端键盘弹起 | `dvh` 单位 + `visualViewport` API fallback |

---

## 六、文件清单

### 新增文件（8 个）

```
frontend/src/components/chat/
├── ChatProviderWrapper.tsx   ← 'use client' 边界 + Admin 路由排除
├── ChatProvider.tsx          ← Context Provider（状态 + SSE 逻辑）
├── ChatWidget.tsx            ← 浮动按钮 + 面板 + 开闭动画
├── ChatButton.tsx            ← 右下角圆形按钮
├── ChatPanel.tsx             ← 面板容器（Header + 内容 + Input）
├── MessageList.tsx           ← 消息列表 + 自动滚动
├── MessageBubble.tsx         ← 单条消息气泡
└── ChatInput.tsx             ← 输入框 + 发送按钮
```

### 修改文件（1 个）

```
frontend/src/app/layout.tsx   ← 引入 ChatProviderWrapper
```

### 无变更

- `next.config.js` — 无变更
- `package.json` — 无新依赖（复用 `react-markdown`）
- `.env` — 无新环境变量
- 所有现有页面组件 — 零改动

---

## 七、测试要点

| 测试场景 | 预期行为 |
|---------|---------|
| 首页点击浮动按钮 | 面板从右下角滑出，显示欢迎消息 |
| 输入问题并发送 | 用户气泡出现，AI 逐字流式输出 |
| 流式输出中导航到博客页 | 面板保持打开，对话历史保留，流式继续 |
| 流式输出中关闭面板 | 请求 abort，已接收内容保留在对话中 |
| 刷新页面 | 对话清空，面板关闭，恢复初始状态 |
| 移动端打开面板 | 全屏展示，Header 显示返回关闭按钮 |
| 空输入框点击发送 | 按钮 disabled，无响应 |
| Admin 页面（/admin/*） | 浮动按钮不显示 |
| 网络断开后发送消息 | AI 消息气泡内显示红色错误提示 |
