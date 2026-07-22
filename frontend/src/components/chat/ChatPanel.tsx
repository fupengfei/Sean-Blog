'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useChat } from './ChatProvider';
import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ArticleContextChip from './ArticleContextChip';

/**
 * ChatPanel — 对话面板外壳，支持拖动 + 最小化
 *
 * 结构（从上到下）：
 * - Header：Logo + 标题 "Sean's AI 助手" + 最小化按钮 + 关闭按钮（渐变背景）
 * - MessageList：flex-1 可滚动消息区域
 * - ChatInput：底部输入栏
 *
 * 响应式：
 * - 桌面 (>=768px)：fixed 右下角可拖动，w-[400px] h-[560px]，rounded-2xl，柔和阴影
 * - 移动 (<768px)：fixed inset-0，全屏无边角（不可拖动）
 */
export default function ChatPanel() {
  const { isOpen, isMinimized, closeChat, minimizeChat } = useChat();

  // ---- 拖动状态（仅桌面端） ----
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const onHeaderMouseDown = useCallback((e: React.MouseEvent) => {
    // 只响应主鼠标按钮
    if (e.button !== 0) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y };
  }, [dragOffset]);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      setDragOffset({
        x: e.clientX - dragStart.current.x,
        y: e.clientY - dragStart.current.y,
      });
    };
    const onMouseUp = () => { isDragging.current = false; };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // 面板关闭/最小化时重置拖动位置
  useEffect(() => {
    if (!isOpen) setDragOffset({ x: 0, y: 0 });
  }, [isOpen]);

  // 仅在移动端（<768px）全屏面板打开时锁定 body 滚动，桌面端不影响页面操作
  useEffect(() => {
    if (!isOpen) return;

    const mql = window.matchMedia('(max-width: 767px)');
    if (!mql.matches) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // 面板是否可见（打开或最小化恢复中）
  const visible = isOpen;

  return (
    <>
      {/* ================================================================ */}
      {/* 移动端全屏面板（不可拖动）                                        */}
      {/* ================================================================ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 对话面板"
        className={`
          md:hidden fixed inset-0 z-40 bg-surface flex flex-col
          transition-all duration-300 ease-out
          ${visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
          }
        `}
      >
        <div className="flex items-center justify-between h-14 px-4 bg-gradient-to-r from-[#002045] to-[#1a365d] text-white shrink-0">
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
          <div className="w-14" />
        </div>

        <ArticleContextChip />
        <MessageList />
        <ChatInput />
      </div>

      {/* ================================================================ */}
      {/* 桌面端浮动面板（可拖动 + 最小化）                                  */}
      {/* ================================================================ */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="AI 对话面板"
        style={{
          transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
          transition: isDragging.current ? 'none' : undefined,
        }}
        className={`
          hidden md:flex fixed bottom-48 right-16 z-40
          w-[400px] h-[560px] flex-col bg-surface
          rounded-2xl border border-outline-variant
          shadow-[0_8px_40px_rgba(0,0,0,0.10),0_0_0_1px_rgba(0,0,0,0.04)]
          transition-all duration-300 ease-out
          overflow-hidden
          ${visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-4 opacity-0 pointer-events-none'
          }
        `}
      >
        {/* Header — 可拖动区域，渐变背景 */}
        <div
          onMouseDown={onHeaderMouseDown}
          className="flex items-center justify-between h-14 px-4 bg-gradient-to-r from-[#002045] to-[#1a365d] text-white shrink-0 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center gap-2.5">
            {/* Logo 替换原来小电脑图标 */}
            <img
              src="/logo.png"
              alt="Logo"
              className="w-6 h-6 rounded object-contain"
            />
            <span className="text-sm font-semibold">Sean&apos;s AI 助手</span>

            {/* 最小化状态标记 */}
            {isMinimized && (
              <span className="text-xs text-white/60 ml-1">(已最小化)</span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {/* 最小化按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); minimizeChat(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="最小化"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
            </button>

            {/* 关闭按钮 */}
            <button
              onClick={(e) => { e.stopPropagation(); closeChat(); }}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              aria-label="关闭对话"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <ArticleContextChip />
        <MessageList />
        <ChatInput />
      </div>
    </>
  );
}
