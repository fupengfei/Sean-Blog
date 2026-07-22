# 智能客服对话组件 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在所有公开页面右下角增加智能客服浮动按钮 + 对话面板，通过 SSE 流式调用后端 `/api/v1/ai/chat`

**Architecture:** RootLayout 中挂载 ChatProviderWrapper（`'use client'` 边界）→ ChatProvider（React Context 管理消息状态 + SSE 请求）→ ChatWidget（纯 UI 容器）。Admin 路由通过 `usePathname()` 排除。跨页导航状态保留（Context 不卸载），刷新页面清空。

**Tech Stack:** Next.js 14 App Router + React Context + TypeScript + Tailwind CSS + 原生 fetch SSE 流读取

## Global Constraints

- 仅公开页面显示，`/admin/*` 路由不渲染
- 后端 API：`GET /api/v1/ai/chat?message=xxx`，返回 SSE（`text/event-stream`）
- 系统预设 prompt 由后端控制，前端只传用户消息
- 零新依赖（复用已有 `react-markdown`）
- 遵循设计系统：主色 `primary`（#002045），字体 Inter，1px 边框卡片风格

---
## File Map

```
frontend/src/
├── app/
│   └── layout.tsx                        ← 修改：引入 ChatProviderWrapper
├── components/
│   └── chat/
│       ├── ChatProviderWrapper.tsx       ← 'use client' 边界，Admin 路由判断
│       ├── ChatProvider.tsx              ← Context Provider（消息状态 + SSE 流逻辑）
│       ├── ChatWidget.tsx                ← 浮动按钮 + 面板容器 + 开闭动画
│       ├── ChatButton.tsx                ← 56x56 圆形浮动按钮
│       ├── ChatPanel.tsx                 ← 面板外壳（Header + MessageList + InputBar）
│       ├── MessageList.tsx               ← 消息列表 + 自动滚动到底部
│       ├── MessageBubble.tsx             ← 单条消息气泡（用户右/AI 左）
│       └── ChatInput.tsx                 ← 输入框 + 发送按钮 + disabled 控制
```

---

### Task 1: ChatProvider — Core Context + SSE Streaming Logic

**Files:**
- Create: `frontend/src/components/chat/ChatProvider.tsx`

**Interfaces:**
- Produces: `ChatMessage` type, `ChatContextValue` type, `useChat()` hook, `ChatProvider` component
- Consumes: nothing (root dependency)

- [ ] **Step 1: Create ChatProvider.tsx with types, context, and full implementation**

```typescript
'use client';

import React, { createContext, useCallback, useContext, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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

// ---------------------------------------------------------------------------
// Welcome message
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 你好！我是 **Sean's AI 助手**，可以问我关于：
- Sean 的技术栈和专业领域
- 博客文章和项目推荐
- 前端 / 后端 / AI 相关技术问题

有什么可以帮你的？`,
  timestamp: Date.now(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let msgIdCounter = 0;
function nextId(): string {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChat(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [isOpen, setIsOpen] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => {
    // Abort ongoing SSE stream
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;

    // 1. Append user message
    const userMsg: ChatMessage = {
      id: nextId(),
      role: 'user',
      content: trimmed,
      timestamp: Date.now(),
    };

    // 2. Append empty assistant placeholder
    const assistantMsg: ChatMessage = {
      id: nextId(),
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    // 3. Build URL
    const url = `/api/v1/ai/chat?message=${encodeURIComponent(trimmed)}`;

    // 4. Create AbortController
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(url, { signal: controller.signal });

      if (!response.ok) {
        // HTTP error
        const errorText =
          response.status >= 500
            ? '⚠️ 服务暂时不可用，请稍后重试'
            : `⚠️ 请求失败 (${response.status})`;
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          updated[updated.length - 1] = {
            ...last,
            content: last.content + errorText,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      // 5. Read SSE stream
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let newContent = '';
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            newContent += line.slice(6);
          } else if (line.startsWith('data:')) {
            newContent += line.slice(5);
          }
        }

        if (newContent) {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              content: last.content + newContent,
            };
            return updated;
          });
        }
      }
    } catch (err: unknown) {
      // Ignore AbortError (intentional cancellation)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setIsStreaming(false);
        return;
      }

      // Network error
      const errorText = '⚠️ 网络连接失败，请稍后重试';
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === 'assistant') {
          updated[updated.length - 1] = {
            ...last,
            content: last.content + errorText,
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [isStreaming]);

  return (
    <ChatContext.Provider
      value={{ messages, isOpen, isStreaming, openChat, closeChat, sendMessage }}
    >
      {children}
    </ChatContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/ChatProvider.tsx
git commit -m "feat: add ChatProvider with SSE streaming chat logic"
```

---

### Task 2: ChatProviderWrapper + layout.tsx Integration

**Files:**
- Create: `frontend/src/components/chat/ChatProviderWrapper.tsx`
- Modify: `frontend/src/app/layout.tsx`

**Interfaces:**
- Consumes: `ChatProvider` from Task 1
- Produces: `ChatProviderWrapper` component (renders ChatProvider + ChatWidget on public pages, renders children directly on admin pages)

- [ ] **Step 1: Create ChatProviderWrapper.tsx**

```typescript
'use client';

import { usePathname } from 'next/navigation';
import { ChatProvider } from './ChatProvider';
import ChatWidget from './ChatWidget';

/**
 * ChatProviderWrapper — 'use client' 边界组件
 *
 * 职责：
 * - 通过 usePathname() 判断当前是否在 /admin/* 路由下
 * - Admin 路由：直接渲染 children，不挂载 ChatProvider 和 ChatWidget
 * - 公开路由：包裹 ChatProvider + ChatWidget
 *
 * 为什么需要这个 wrapper：
 * - RootLayout 是 server component，不能直接使用 'use client' hooks
 * - ChatProvider 需要 Context + SSE 流，必须是 client component
 * - Admin 页面有自己的布局和认证守卫，不应出现聊天组件
 */
export default function ChatProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Admin 路由不渲染聊天组件
  if (pathname.startsWith('/admin')) {
    return <>{children}</>;
  }

  return (
    <ChatProvider>
      <ChatWidget />
      {children}
    </ChatProvider>
  );
}
```

- [ ] **Step 2: Modify layout.tsx to include ChatProviderWrapper**

In `frontend/src/app/layout.tsx`, add the import and wrap children:

```tsx
// Add this import at top (after existing imports):
import ChatProviderWrapper from '@/components/chat/ChatProviderWrapper';

// Change the body content from:
//   <body className="font-ui">
//     <PageViewTracker />
//     {children}
//   </body>
//
// To:
//   <body className="font-ui">
//     <ChatProviderWrapper>
//       <PageViewTracker />
//       {children}
//     </ChatProviderWrapper>
//   </body>
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/chat/ChatProviderWrapper.tsx frontend/src/app/layout.tsx
git commit -m "feat: integrate ChatProviderWrapper into root layout"
```

---

### Task 3: ChatButton — Floating Action Button

**Files:**
- Create: `frontend/src/components/chat/ChatButton.tsx`

**Interfaces:**
- Consumes: `useChat()` → `isOpen`, `openChat`, `closeChat`
- Produces: `<ChatButton />` (56x56 fixed bottom-right circle with icon toggle)

- [ ] **Step 1: Create ChatButton.tsx**

```typescript
'use client';

import { useChat } from './ChatProvider';

/**
 * ChatButton — 右下角圆形浮动按钮
 *
 * 两种状态：
 * - 收起（isOpen = false）：聊天气泡图标
 * - 展开（isOpen = true）：X 关闭图标
 *
 * 样式：56x56 圆形，Navy 实色背景，hover 变浅 + 微阴影，图标旋转切换动画
 */
export default function ChatButton() {
  const { isOpen, openChat, closeChat } = useChat();

  return (
    <button
      onClick={isOpen ? closeChat : openChat}
      aria-label={isOpen ? '关闭对话' : '打开对话'}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        bg-primary text-on-primary
        hover:bg-primary-container
        hover:shadow-[0px_4px_12px_rgba(0,0,0,0.05)]
        flex items-center justify-center
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary/30
      `}
    >
      {/* 聊天气泡图标（收起时显示） */}
      <svg
        className={`absolute w-6 h-6 transition-all duration-200 ${
          isOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        />
      </svg>

      {/* X 关闭图标（展开时显示） */}
      <svg
        className={`absolute w-5 h-5 transition-all duration-200 ${
          isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
        }`}
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/ChatButton.tsx
git commit -m "feat: add ChatButton floating action button"
```

---

### Task 4: MessageBubble — Single Message Component

**Files:**
- Create: `frontend/src/components/chat/MessageBubble.tsx`

**Interfaces:**
- Consumes: `ChatMessage` type from ChatProvider, `isStreaming` from `useChat()`
- Produces: `<MessageBubble message={msg} />` — renders one message with role-appropriate styling

- [ ] **Step 1: Create MessageBubble.tsx**

```typescript
'use client';

import ReactMarkdown from 'react-markdown';
import type { ChatMessage } from './ChatProvider';
import { useChat } from './ChatProvider';

/**
 * MessageBubble — 单条聊天消息气泡
 *
 * 用户消息（role === 'user'）：
 * - 右对齐，浅灰背景 surface-container-low
 * - max-w-[80%]，rounded-lg
 *
 * AI 消息（role === 'assistant'）：
 * - 左对齐，无背景纯文字
 * - max-w-[85%]
 * - 用 react-markdown 渲染 Markdown（加粗、链接、代码）
 * - 流式输出时末尾显示闪烁光标 ▊
 *
 * @param message - 要渲染的消息对象
 * @param isLastAssistant - 是否为最后一条 AI 消息（控制光标显示）
 */
export default function MessageBubble({
  message,
  isLastAssistant,
}: {
  message: ChatMessage;
  isLastAssistant: boolean;
}) {
  const { isStreaming } = useChat();
  const isUser = message.role === 'user';
  const showCursor = isLastAssistant && isStreaming;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          px-3 py-2 text-sm leading-relaxed
          ${isUser
            ? 'bg-surface-container-low rounded-lg max-w-[80%] text-on-surface'
            : 'max-w-[85%] text-on-surface'
          }
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-a:text-primary prose-code:text-sm prose-code:bg-surface-container-low prose-code:px-1 prose-code:rounded">
            <ReactMarkdown>{message.content}</ReactMarkdown>
            {showCursor && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse align-text-bottom ml-0.5" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/MessageBubble.tsx
git commit -m "feat: add MessageBubble component with Markdown rendering"
```

---

### Task 5: MessageList — Message List with Auto-Scroll

**Files:**
- Create: `frontend/src/components/chat/MessageList.tsx`

**Interfaces:**
- Consumes: `useChat()` → `messages`, `ChatMessage` type from ChatProvider; `MessageBubble` from Task 4
- Produces: `<MessageList />` — scrollable message list, auto-scrolls to bottom on new message

- [ ] **Step 1: Create MessageList.tsx**

```typescript
'use client';

import { useEffect, useRef } from 'react';
import { useChat } from './ChatProvider';
import MessageBubble from './MessageBubble';

/**
 * MessageList — 消息列表组件
 *
 * 功能：
 * - 渲染所有消息（从 ChatProvider 的 messages 数组）
 * - 新消息到达时自动滚动到底部（smooth 动画）
 * - 空消息内容不渲染（占位 assistant 消息在流式开始前）
 *
 * 滚动策略：
 * - messages 变化 → useEffect 触发 scrollIntoView
 * - 使用 ref 指向列表底部哨兵元素
 */
export default function MessageList() {
  const { messages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
      {messages.map((msg, index) => {
        // Skip empty assistant messages (placeholder before streaming starts)
        if (msg.role === 'assistant' && !msg.content) return null;

        const isLastAssistant =
          msg.role === 'assistant' &&
          index === messages.length - 1;

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastAssistant={isLastAssistant}
          />
        );
      })}
      {/* Scroll anchor — invisible sentinel at bottom of list */}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/MessageList.tsx
git commit -m "feat: add MessageList with auto-scroll"
```

---

### Task 6: ChatInput — Input Bar

**Files:**
- Create: `frontend/src/components/chat/ChatInput.tsx`

**Interfaces:**
- Consumes: `useChat()` → `sendMessage`, `isStreaming`
- Produces: `<ChatInput />` — text input + send button, managed locally

- [ ] **Step 1: Create ChatInput.tsx**

```typescript
'use client';

import { useState, useRef } from 'react';
import { useChat } from './ChatProvider';

/**
 * ChatInput — 消息输入栏
 *
 * 交互规则：
 * - 空消息或仅空格 → 发送按钮 disabled（灰色不可点击）
 * - 流式输出中 → 输入框和按钮都 disabled
 * - 发送后自动清空输入框并聚焦
 * - Enter 键发送，Shift+Enter 换行
 *
 * 样式：
 * - h-12，border-t，与面板底部对齐
 * - 输入框 flex-1，无边框无 outline
 * - 发送按钮：Navy 圆形图标按钮
 */
export default function ChatInput() {
  const { sendMessage, isStreaming } = useChat();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = input.trim();
  const canSend = trimmed.length > 0 && !isStreaming;

  const handleSend = async () => {
    if (!canSend) return;
    await sendMessage(trimmed);
    setInput('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 border-t border-outline-variant bg-surface">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入你的问题..."
        disabled={isStreaming}
        className="flex-1 h-9 px-3 text-sm text-on-surface placeholder:text-outline bg-transparent border-none outline-none disabled:opacity-50"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        aria-label="发送消息"
        className={`
          w-9 h-9 rounded-full flex items-center justify-center shrink-0
          transition-colors duration-200
          ${canSend
            ? 'bg-primary text-on-primary hover:bg-primary-container'
            : 'bg-surface-container-high text-outline cursor-not-allowed'
          }
        `}
      >
        {/* Send icon (paper plane) */}
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/ChatInput.tsx
git commit -m "feat: add ChatInput with send button and disabled states"
```

---

### Task 7: ChatPanel — Dialog Panel Shell

**Files:**
- Create: `frontend/src/components/chat/ChatPanel.tsx`

**Interfaces:**
- Consumes: `useChat()` → `isOpen`, `closeChat`; `MessageList` from Task 5; `ChatInput` from Task 6
- Produces: `<ChatPanel />` — complete panel with Header + MessageList + ChatInput, responsive

- [ ] **Step 1: Create ChatPanel.tsx**

```typescript
'use client';

import { useChat } from './ChatProvider';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

/**
 * ChatPanel — 对话面板外壳
 *
 * 结构（从上到下）：
 * - Header：标题 "Sean's AI 助手" + 关闭按钮（Navy 背景白色文字）
 * - MessageList：flex-1 可滚动消息区域
 * - ChatInput：底部输入栏
 *
 * 响应式：
 * - 桌面 (≥768px)：fixed 右下角，w-[380px] h-[520px]，rounded-lg，1px 边框
 * - 移动 (<768px)：fixed inset-0，全屏无边角
 *
 * 动画：面板通过 isOpen 控制 CSS transition（translateY + opacity）
 */
export default function ChatPanel() {
  const { isOpen, closeChat } = useChat();

  return (
    <>
      {/* Mobile full-screen panel */}
      <div
        className={`
          md:hidden fixed inset-0 z-40 bg-surface flex flex-col
          transition-all duration-300 ease-out
          ${isOpen
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 bg-primary text-on-primary shrink-0">
          <button
            onClick={closeChat}
            className="flex items-center gap-2 text-sm font-medium"
            aria-label="关闭对话"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <span className="text-sm font-semibold">Sean&apos;s AI 助手</span>
          <div className="w-14" /> {/* Spacer for centering title */}
        </div>

        <MessageList />
        <ChatInput />
      </div>

      {/* Desktop floating panel */}
      <div
        className={`
          hidden md:flex fixed bottom-24 right-6 z-40
          w-[380px] h-[520px] flex-col bg-surface
          rounded-lg border border-outline-variant
          shadow-[0px_4px_24px_rgba(0,0,0,0.08)]
          transition-all duration-300 ease-out
          ${isOpen
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 bg-primary text-on-primary shrink-0 rounded-t-lg">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-semibold">Sean&apos;s AI 助手</span>
          </div>
          <button
            onClick={closeChat}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            aria-label="关闭对话"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <MessageList />
        <ChatInput />
      </div>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/chat/ChatPanel.tsx
git commit -m "feat: add ChatPanel with responsive desktop/mobile layouts"
```

---

### Task 8: ChatWidget — Wire Everything Together

**Files:**
- Create: `frontend/src/components/chat/ChatWidget.tsx`

**Interfaces:**
- Consumes: `ChatButton` from Task 3, `ChatPanel` from Task 7
- Produces: `<ChatWidget />` — renders ChatButton (always) + ChatPanel (with open/close animation)

- [ ] **Step 1: Create ChatWidget.tsx**

```typescript
'use client';

import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';

/**
 * ChatWidget — 智能客服 UI 入口
 *
 * 这是 ChatWidget 的顶层组件，组装：
 * - ChatButton：始终渲染的右下角浮动按钮（点击切换开闭）
 * - ChatPanel：对话面板（通过 ChatPanel 内部 CSS transition 控制显示/隐藏）
 *
 * ChatPanel 始终挂载但通过 opacity + pointer-events 控制可见性，
 * 保证面板关闭期间对话历史不丢失。
 */
export default function ChatWidget() {
  return (
    <>
      <ChatButton />
      <ChatPanel />
    </>
  );
}
```

- [ ] **Step 2: Verify all imports are correctly wired**

Double-check import chains:
- `ChatWidget` → imports `ChatButton`, `ChatPanel`
- `ChatPanel` → imports `useChat` from `ChatProvider`, `MessageList`, `ChatInput`
- `MessageList` → imports `useChat` from `ChatProvider`, `MessageBubble`
- `MessageBubble` → imports `useChat` + `ChatMessage` from `ChatProvider`
- `ChatInput` → imports `useChat` from `ChatProvider`
- `ChatButton` → imports `useChat` from `ChatProvider`
- `ChatProviderWrapper` → imports `ChatProvider` from `ChatProvider`, `ChatWidget`
- `layout.tsx` → imports `ChatProviderWrapper`

All components access ChatProvider through the `useChat()` hook at the appropriate level in the tree. ✅

- [ ] **Step 3: Run dev server to verify compilation**

```bash
cd frontend && npm run dev
```

Expected: No TypeScript errors, dev server starts successfully.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chat/ChatWidget.tsx
git commit -m "feat: add ChatWidget to wire button and panel together"
```

---

## Verification Checklist

After all tasks are complete, manually verify these behaviors:

| # | 测试场景 | 预期行为 |
|---|---------|---------|
| 1 | 访问首页 | 右下角出现 Navy 圆形聊天气泡按钮 |
| 2 | 点击浮动按钮 | 面板从右下角滑出，显示欢迎消息 |
| 3 | 输入问题并发送 | 用户气泡出现，AI 逐字流式输出 |
| 4 | 流式输出中导航到博客页 | 面板保持打开，对话历史保留 |
| 5 | 关闭面板后重新打开 | 对话历史保留 |
| 6 | 刷新页面（F5） | 对话清空，面板关闭，回到初始状态 |
| 7 | 移动端视口（<768px） | 全屏面板，Header 左箭头返回按钮 |
| 8 | 流式输出中空输入框 | 发送按钮 disabled 灰色 |
| 9 | 访问 /admin 任意页面 | 浮动按钮不出现 |
| 10 | 断网后发送消息 | AI 消息末尾显示红色错误提示 |
