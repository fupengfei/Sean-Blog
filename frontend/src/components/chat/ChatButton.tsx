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
