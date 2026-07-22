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
