'use client';

import { useChat } from './ChatProvider';

/**
 * ChatButton — 右下角浮动按钮
 *
 * 两种状态：
 * - 收起（isOpen = false）：聊天气泡图标 + "Sean's AI 助手" 文字，胶囊形
 * - 展开（isOpen = true）：X 关闭图标
 *
 * 样式：胶囊形 pill，主色渐变背景，柔和阴影 + 微光环
 */
export default function ChatButton() {
  const { isOpen, isMinimized, openChat, closeChat } = useChat();

  const handleClick = () => {
    if (isOpen) {
      closeChat();
    } else {
      openChat();
    }
  };

  return (
    <button
      onClick={handleClick}
      aria-label={isOpen ? '关闭对话' : '打开对话'}
      className={`
        fixed bottom-32 right-16 z-50
        h-12 rounded-full
        bg-gradient-to-br from-[#002045] to-[#1a365d]
        text-white
        shadow-[0_4px_20px_rgba(0,32,69,0.25),0_0_0_4px_rgba(0,32,69,0.06)]
        hover:shadow-[0_8px_30px_rgba(0,32,69,0.35),0_0_0_8px_rgba(0,32,69,0.08)]
        hover:scale-105
        flex items-center
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-[#002045]/30
        ${isOpen ? 'w-12 justify-center' : 'w-auto px-5 gap-2'}
      `}
    >
      {/* 聊天气泡图标（关闭时显示） */}
      {!isOpen && (
        <svg
          className="w-5 h-5 shrink-0"
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
      )}

      {/* 文字（关闭时显示） */}
      {!isOpen && (
        <span className="text-sm font-medium whitespace-nowrap">Sean&apos;s AI 助手</span>
      )}

      {/* X 关闭图标（展开时显示） */}
      {isOpen && (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}

      {/* 最小化状态：绿色圆点提示 */}
      {isMinimized && !isOpen && (
        <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#0a6c44] border-2 border-white" />
      )}
    </button>
  );
}
