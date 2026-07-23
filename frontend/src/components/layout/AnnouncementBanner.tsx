'use client';

import React, { useEffect, useState } from 'react';
import { useChat } from '@/components/chat/ChatProvider';

// ---------------------------------------------------------------------------
// 首页上线公告横幅（Announcement Banner）
//
// 庆祝 Sean's AI 智能助手（RAG + Function Call + Skill）顺利上线：
// - 点击「立即体验」按钮 → useChat().openChat() 打开助手聊天面板（横幅其它区域不可点击）
// - × 关闭 → 写入 localStorage（key 带版本号，将来换公告升级版本号可重新触达）
// - 服务端不渲染（localStorage 仅客户端可读）；客户端判定未关闭后播放滑入动画
// ---------------------------------------------------------------------------

/** localStorage key：更换公告内容时升级版本号（_v1 → _v2）即可重新触达 */
const STORAGE_KEY = 'sean_announcement_dismissed_v1';

/** 退场动画时长（ms），与下方 duration-200 保持一致 */
const EXIT_DURATION = 200;

export default function AnnouncementBanner() {
  const { openChat } = useChat();

  /** 是否展示（客户端读取 localStorage 后确定，服务端恒为 false） */
  const [visible, setVisible] = useState(false);
  /** 入场动画是否已触发（渲染后下一帧置 true，使 transition 从隐藏态开始） */
  const [entered, setEntered] = useState(false);
  /** 是否正在播放退场动画 */
  const [closing, setClosing] = useState(false);

  // 客户端挂载后读取 localStorage，决定是否需要展示
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  // visible 后等待两帧再触发入场动画，确保浏览器已绘制初始（隐藏）状态
  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

  /** 关闭公告：播放退场动画后写入 localStorage 并卸载 */
  const handleDismiss = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    setClosing(true);
    window.setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, new Date().toISOString());
      setVisible(false);
    }, EXIT_DURATION);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="上线公告"
      className={[
        'relative overflow-hidden border-b border-outline-variant bg-gradient-to-r from-surface-container to-primary-fixed',
        'transition-all ease-out',
        closing ? 'duration-200' : 'duration-300',
        entered && !closing ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0',
      ].join(' ')}
    >
      {/* 左端绿色环境光晕：呼应 NEW 徽章，低调的光层次 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full bg-secondary/15 blur-3xl"
      />

      {/* 流光：低透明度白色光带缓慢扫过（减弱动态效果时关闭） */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        <span className="absolute inset-y-0 left-0 w-1/3 animate-banner-sheen bg-gradient-to-r from-transparent via-primary/[0.05] to-transparent motion-reduce:animate-none" />
      </span>

      {/* 横幅内容容器：仅展示，不可点击；交互收敛到「立即体验」按钮 */}
      <div
        className={[
          'relative mx-auto flex w-full max-w-[1200px] flex-col items-center justify-center gap-2 px-4 py-2 pr-10',
          'sm:flex-row sm:flex-wrap sm:gap-4 sm:px-6 sm:pr-12 lg:px-10',
        ].join(' ')}
      >
        {/* 徽章组：sparkle + NEW 始终同行，作为不可收缩的整体 */}
        <span className="inline-flex shrink-0 items-center gap-2">
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4 text-primary/80"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
            />
          </svg>

          <span
            aria-hidden
            className="animate-banner-pulse rounded bg-secondary px-2 py-0.5 text-xs font-semibold leading-4 text-on-secondary motion-reduce:animate-none"
          >
            NEW
          </span>
        </span>

        {/* 文案：min-w-0 允许收缩换行；移动端占满整行、桌面端行内，均水平居中 */}
        <p className="w-full min-w-0 text-center text-sm leading-5 text-primary sm:w-auto">
          <span className="font-semibold">Sean's AI 智能助手正式上线！</span>
          <span className="block text-on-surface-variant sm:inline">
            {' '}内置 RAG 知识库检索 · Function Call 函数调用 · Skill 任务编排三大核心能力{' '}
            <span className="whitespace-nowrap">—— 从简单问答，到全域协同</span>
          </span>
        </p>

        <button
          type="button"
          onClick={openChat}
          aria-label="立即体验，打开 Sean's AI 智能助手"
          className="group inline-flex shrink-0 cursor-pointer items-center gap-1 rounded bg-primary px-3 py-1 text-xs font-medium text-on-primary transition-colors duration-200 hover:bg-primary-container focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary/70"
        >
          立即体验
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>

      {/* 关闭按钮 */}
      <button
        type="button"
        aria-label="关闭公告"
        onClick={handleDismiss}
        className={[
          'absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded p-1 text-primary/50 sm:right-4',
          'transition-colors duration-200 hover:text-primary',
          'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary/70',
        ].join(' ')}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-4 w-4"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
