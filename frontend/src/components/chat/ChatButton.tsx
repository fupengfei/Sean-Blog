'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useChat } from './ChatProvider';

/**
 * ChatButton — 右下角浮动按钮
 *
 * 桌面端（≥768px）：
 * - 固定右下角，胶囊形 pill（图标 + "Sean's AI 助手" 文字）
 * - 点击切换聊天面板
 *
 * 移动端（<768px）：
 * - 右下角圆形图标按钮（仅图标，节省空间）
 * - 支持长按（300ms）拖动到任意位置
 * - 短按（<300ms 且未拖动）切换聊天面板
 */

/** 默认位置（移动端右下角，桌面端由 Tailwind 固定） */
const DEFAULT_POS = { x: 0, y: 0 };

/** 长按触发拖动的阈值 */
const LONG_PRESS_MS = 300;
/** 拖动判定最小位移（px），小于此值视为点击 */
const DRAG_THRESHOLD = 6;

export default function ChatButton() {
  const { isOpen, isMinimized, openChat, closeChat } = useChat();

  // ---- 移动端拖动状态 ----
  const [pos, setPos] = useState(DEFAULT_POS);
  const [isMobile, setIsMobile] = useState(false);
  const dragging = useRef(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStart = useRef({ x: 0, y: 0 });
  const touchStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // 仅在客户端判断是否移动端
  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia('(max-width: 767px)').matches);
    check();
    const mql = window.matchMedia('(max-width: 767px)');
    mql.addEventListener('change', check);
    return () => mql.removeEventListener('change', check);
  }, []);

  // 面板关闭时重置位置
  useEffect(() => {
    if (!isOpen) setPos(DEFAULT_POS);
  }, [isOpen]);

  // ---- Touch 事件（移动端长按拖动） ----

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    touchStartPos.current = { x: pos.x, y: pos.y };
    hasMoved.current = false;

    longPressTimer.current = setTimeout(() => {
      dragging.current = true;
    }, LONG_PRESS_MS);
  }, [isMobile, pos]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isMobile) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;

    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      hasMoved.current = true;
    }

    if (dragging.current) {
      setPos({
        x: touchStartPos.current.x + dx,
        y: touchStartPos.current.y + dy,
      });
    }
  }, [isMobile]);

  const onTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    const wasDragging = dragging.current;
    dragging.current = false;

    if (!isMobile) return;

    // 短按（未触发长按且未明显移动）→ 视为点击
    if (!wasDragging && !hasMoved.current) {
      if (isOpen) closeChat();
      else openChat();
    }
  }, [isMobile, isOpen, openChat, closeChat]);

  // ---- 桌面端点击 ----
  const handleClick = () => {
    if (isMobile) return; // 移动端由 touch 事件处理
    if (isOpen) closeChat();
    else openChat();
  };

  // ---- 移动端样式（动态位置 + 圆形） ----
  const mobileStyle: React.CSSProperties = isMobile
    ? {
        position: 'fixed',
        right: 16 - pos.x,
        bottom: 96 - pos.y,
        zIndex: 99,
      }
    : {};

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      aria-label={isOpen ? '关闭对话' : '打开对话'}
      style={mobileStyle}
      className={`
        z-50 h-12 rounded-full
        bg-gradient-to-br from-[#002045] to-[#1a365d]
        text-white
        shadow-[0_4px_20px_rgba(0,32,69,0.25),0_0_0_4px_rgba(0,32,69,0.06)]
        hover:shadow-[0_8px_30px_rgba(0,32,69,0.35),0_0_0_8px_rgba(0,32,69,0.08)]
        flex items-center justify-center
        transition-all duration-300 ease-out
        focus:outline-none focus:ring-2 focus:ring-[#002045]/30
        active:scale-95
        select-none touch-none
        ${isMobile
          ? 'w-12 shadow-lg'
          : 'fixed bottom-32 right-16 hover:scale-105'
        }
        ${!isMobile && isOpen
          ? 'w-12'
          : ''
        }
        ${!isMobile && !isOpen
          ? 'w-auto px-5 gap-2'
          : ''
        }
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

      {/* 文字（桌面端关闭时显示；移动端不显示文字节省空间） */}
      {!isOpen && !isMobile && (
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
