'use client';

import { useEffect, useState } from 'react';

// ---------------------------------------------------------------------------
// 智能客服通知横幅（Chat Notice Banner）
//
// 说明 DeepSeek 模型与 Spring AI 2.0.0 流式聚合的 tool_calls 兼容问题，
// 以及当前采用的同步调用 + SSE 单事件返回方案。
//
// - × 关闭 → 写入 localStorage（key 带版本号，升级后可重新触达）
// - 服务端不渲染（localStorage 仅客户端可读）
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'sean_chat_notice_dismissed_v1';

const EXIT_DURATION = 200;

export default function ChatNoticeBanner() {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    setVisible(true);
  }, []);

  useEffect(() => {
    if (!visible) return;
    const raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setEntered(true));
    });
    return () => cancelAnimationFrame(raf);
  }, [visible]);

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
      role="note"
      aria-label="技术说明"
      className={[
        'relative mx-3 mt-2 overflow-hidden rounded-lg border border-outline-variant bg-surface-container-high',
        'transition-all ease-out',
        closing ? 'duration-200' : 'duration-300',
        entered && !closing ? 'max-h-40 translate-y-0 opacity-100' : 'max-h-0 -translate-y-1 opacity-0',
      ].join(' ')}
    >
      {/* 左侧绿色指示条 */}
      <div aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-secondary rounded-l-lg" />

      <div className="relative flex items-start gap-2 px-3 py-2.5 pr-8">
        {/* 图标 */}
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="mt-0.5 h-4 w-4 shrink-0 text-secondary"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
          />
        </svg>

        {/* 文案 */}
        <p className="min-w-0 text-xs leading-relaxed text-on-surface/80">
          <span className="font-medium text-on-surface">
            当前采用同步调用 + SSE 单事件返回
          </span>
          <span className="block mt-0.5 text-on-surface/60 leading-relaxed">
            由于 DeepSeek 模型与 Spring AI 2.0.0 的流式聚合存在{' '}
            <code className="rounded bg-on-surface/8 px-1 py-px text-[11px]">tool_calls</code>
            {' '}丢失的兼容问题，暂以同步{' '}
            <code className="rounded bg-on-surface/8 px-1 py-px text-[11px]">.call()</code>
            {' '}+ SSE 单事件方式返回完整响应。不影响功能正常使用。
          </span>
        </p>

        {/* 关闭按钮 */}
        <button
          type="button"
          aria-label="关闭通知"
          onClick={handleDismiss}
          className={[
            'absolute right-1.5 top-1.5 rounded p-0.5 text-on-surface/30',
            'transition-colors duration-200 hover:text-on-surface/60',
            'focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary/50',
          ].join(' ')}
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-3.5 w-3.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
