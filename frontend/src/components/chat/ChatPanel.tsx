'use client';

import { useEffect } from 'react';
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
 * - 桌面 (>=768px)：fixed 右下角，w-[380px] h-[520px]，rounded-lg，1px 边框
 * - 移动 (<768px)：fixed inset-0，全屏无边角
 *
 * 动画：面板通过 isOpen 控制 CSS transition（translateY + opacity）
 */
export default function ChatPanel() {
  const { isOpen, closeChat } = useChat();

  // Lock body scroll when mobile panel is open
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [isOpen]);

  return (
    <>
      {/* Mobile full-screen panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 对话面板"
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
        role="dialog"
        aria-modal="true"
        aria-label="AI 对话面板"
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
