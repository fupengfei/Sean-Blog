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
 * - 圆角输入框 + 柔和背景
 * - 发送按钮：主色渐变圆形图标按钮
 */
export default function ChatInput() {
  const { sendMessage, stopStreaming, isStreaming, articleContext } = useChat();
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
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-t border-outline-variant/60 bg-surface">
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isStreaming
            ? 'AI 正在回复...'
            : articleContext
              ? '问问关于这篇文章的问题...'
              : '输入您的问题...'
        }
        disabled={isStreaming}
        className="flex-1 h-10 px-4 text-sm text-on-surface placeholder:text-outline bg-surface-container-low rounded-xl border-none outline-none disabled:opacity-50 transition-colors"
      />

      {/* 流式输出中 → 红色终止按钮 */}
      {isStreaming ? (
        <button
          onClick={stopStreaming}
          aria-label="停止生成"
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="2" />
          </svg>
        </button>
      ) : (
        /* 正常 → 发送按钮 */
        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="发送消息"
          className={`
            w-9 h-9 rounded-xl flex items-center justify-center shrink-0
            transition-all duration-200
            ${canSend
              ? 'bg-gradient-to-br from-[#002045] to-[#1a365d] text-white hover:shadow-[0_2px_8px_rgba(0,32,69,0.3)]'
              : 'bg-surface-container-high text-outline cursor-not-allowed'
            }
          `}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      )}
    </div>
  );
}
