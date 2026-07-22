'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

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
  isMinimized: boolean;
  isStreaming: boolean;
  openChat: () => void;
  closeChat: () => void;
  minimizeChat: () => void;
  sendMessage: (text: string) => Promise<void>;
  stopStreaming: () => void;
}

// ---------------------------------------------------------------------------
// Welcome message
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content: `👋 您好！我是 **Sean's AI 助手**，可以问我关于：
- Sean 的技术栈、专业领域和兴趣爱好
- 博客文章和项目推荐
- 前端 / 后端 / AI 相关技术问题

有什么可以帮您？`,
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight stream on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  /** 打开面板：如果已最小化则恢复，否则正常打开 */
  const openChat = useCallback(() => {
    if (isMinimized) {
      setIsMinimized(false);
    }
    setIsOpen(true);
  }, [isMinimized]);

  /** 关闭面板：中断流、清空对话（重置为欢迎语）、重置最小化 */
  const closeChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsOpen(false);
    setIsMinimized(false);
    setIsStreaming(false);
    setMessages([WELCOME_MESSAGE]);
  }, []);

  /** 最小化：隐藏面板但保持流和对话状态 */
  const minimizeChat = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(true);
  }, []);

  /** 终止生成：中断当前 SSE 流，保留已接收内容 */
  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
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

    // 3. Build URL — 直连后端避免 Next.js rewrite 代理缓冲 SSE 流
    const base = process.env.NEXT_PUBLIC_BACKEND_URL || '';
    const url = base
      ? `${base}/ai/chat?message=${encodeURIComponent(trimmed)}`
      : `/api/v1/ai/chat?message=${encodeURIComponent(trimmed)}`;

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

      const contentType = response.headers.get('content-type') || '';
      const isSSE = contentType.includes('text/event-stream');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        if (isSSE) {
          const events = buffer.split('\n\n');
          buffer = events.pop() || '';

          // 本轮 reader.read() 收到的所有 SSE 事件，一次性拼好更新 state
          let batchContent = '';
          for (const event of events) {
            if (!event.trim()) continue;
            const dataLines: string[] = [];
            for (const line of event.split('\n')) {
              if (line.startsWith('data: ')) dataLines.push(line.slice(6));
              else if (line.startsWith('data:')) dataLines.push(line.slice(5));
            }
            if (dataLines.length > 0) {
              batchContent += dataLines.join('\n');
            }
          }

          if (batchContent) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + batchContent,
              };
              return updated;
            });
          }
        } else {
          if (buffer) {
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              updated[updated.length - 1] = {
                ...last,
                content: last.content + buffer,
              };
              return updated;
            });
            buffer = '';
          }
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
      value={{ messages, isOpen, isMinimized, isStreaming, openChat, closeChat, minimizeChat, sendMessage, stopStreaming }}
    >
      {children}
    </ChatContext.Provider>
  );
}
