'use client';

// =============================================================================
// WeChatShareButton — 文章微信分享按钮
// =============================================================================
// 点击微信图标弹出二维码：桌面端为贴近图标的 popover，移动端为居中模态。
// 二维码内容为当前页面 URL（window.location.href），微信扫码即可在微信内
// 打开文章并转发给好友/朋友圈。附带「复制链接」作为非微信场景补充。
//
// 颜色说明：微信品牌绿 #07C160 不在设计系统 token 内，按约定以 Tailwind 任意值
// （text-[#07C160] 等）硬编码使用；二维码前景 #002045 / 背景 #ffffff 为库 prop，
// 仅接受 hex，分别对应 primary / surface-container-lowest token 的值。
// =============================================================================

import { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { FaWeixin, FaTimes, FaLink, FaCheck } from 'react-icons/fa';

/**
 * 二维码容器四角的取景框角标（L 形，微信绿），呼应"扫一扫"动作
 */
function CornerMark({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const positionClass = {
    tl: 'top-0 left-0 border-t-[3px] border-l-[3px]',
    tr: 'top-0 right-0 border-t-[3px] border-r-[3px]',
    bl: 'bottom-0 left-0 border-b-[3px] border-l-[3px]',
    br: 'bottom-0 right-0 border-b-[3px] border-r-[3px]',
  }[position];
  return (
    <span
      aria-hidden
      className={`absolute w-4 h-4 border-[#07C160] ${positionClass} pointer-events-none`}
    />
  );
}

/**
 * 微信分享按钮（自包含，零 props）
 *
 * - 桌面（≥sm）：图标旁弹出 popover，右对齐防止越界
 * - 移动（<sm）：居中模态 + 半透明遮罩，附截图识别提示
 * - 关闭方式：点击外部 / Esc / × 按钮 / 遮罩
 */
export default function WeChatShareButton() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [clipboardOk, setClipboardOk] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevOpenRef = useRef(false);
  const wasMobileRef = useRef(false);

  // 客户端 mount 后取当前文章 URL 作为二维码内容
  // （初始为 null，避免 SSR 与首帧 hydration 不一致）
  useEffect(() => {
    setUrl(window.location.href);
    setClipboardOk(!!navigator.clipboard);
  }, []);

  // ------------------------------------------------------------------
  // 弹窗开/关副作用（单一 effect，按序处理）：
  //  - inert 同步：关闭态两容器 inert，移出 Tab 序与无障碍树（修复 opacity-0
  //    仍挂载导致的隐藏按钮可被 Tab 聚焦的问题）；打开态清除
  //  - 移动端模态（dialog 语义）：焦点移入关闭按钮、Tab 焦点陷阱、锁定背后
  //    页面滚动、关闭后焦点归还触发器
  //  - 桌面 popover（非模态）：不抢焦点、不陷阱，仅 Esc + 点击外部关闭
  //  - 两态共用：Esc 关闭 + 点击组件外部关闭
  // ------------------------------------------------------------------
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    prevOpenRef.current = open;

    const isMobile = window.matchMedia('(max-width: 639px)').matches;
    const visible = isMobile ? modalRef.current : popoverRef.current;
    const setInert = (el: HTMLDivElement | null, value: boolean) => {
      if (el) (el as HTMLElement & { inert?: boolean }).inert = value;
    };
    setInert(popoverRef.current, !open);
    setInert(modalRef.current, !open);

    if (!open) {
      // 仅当上一态是移动端模态打开时才归还焦点（桌面 popover 焦点从未离开触发器，
      // 且点击外部关闭时不应抢占用户点击目标的焦点）
      if (wasOpen && wasMobileRef.current) triggerRef.current?.focus();
      return;
    }

    wasMobileRef.current = isMobile;

    let restoreOverflow: (() => void) | undefined;
    if (isMobile) {
      // 焦点移入弹窗（关闭按钮），便于键盘与读屏操作
      visible
        ?.querySelector<HTMLButtonElement>('button[aria-label="关闭分享弹窗"]')
        ?.focus();
      // 模态全屏，锁定背后页面滚动
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      restoreOverflow = () => {
        document.body.style.overflow = prev;
      };
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      // Tab 焦点陷阱：仅移动端模态，循环限制在可见弹窗内
      if (isMobile && e.key === 'Tab' && visible) {
        const nodes = visible.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
        const list = Array.from(nodes).filter((el) => el.offsetParent !== null);
        if (list.length === 0) return;
        const first = list[0];
        const last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onMouseDown);
      restoreOverflow?.();
    };
  }, [open]);

  // 卸载时清理「已复制」反馈定时器
  useEffect(() => {
    return () => {
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
    };
  }, []);

  const handleCopy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      if (copiedTimer.current) clearTimeout(copiedTimer.current);
      copiedTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch {
      // 非安全上下文 clipboard 不可用；clipboardOk 为 false 时按钮已隐藏，此处兜底忽略
    }
  };

  // ------------------------------------------------------------------
  // 弹窗卡片内容（桌面 popover 与移动模态共用）
  // ------------------------------------------------------------------
  const shareCard = url && (
    <div className="w-[240px] rounded-lg border border-outline-variant bg-surface-container-lowest p-5">
      {/* 顶栏：微信绿图标 + 标题 + 关闭按钮 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FaWeixin size={16} className="text-[#07C160] flex-shrink-0" />
          <span className="font-display text-[15px] font-semibold text-primary">
            微信扫码分享
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="关闭分享弹窗"
          className="p-1 rounded text-on-surface-variant/60 hover:text-on-surface-variant hover:bg-surface-container transition-colors"
        >
          <FaTimes size={13} />
        </button>
      </div>

      {/* 二维码 + 取景框角标（Navy 前景，与品牌一致） */}
      <div
        data-testid="wechat-share-qr"
        className="relative w-fit mx-auto p-3 bg-surface-container-lowest border border-outline-variant rounded"
      >
        <CornerMark position="tl" />
        <CornerMark position="tr" />
        <CornerMark position="bl" />
        <CornerMark position="br" />
        {/* fgColor/bgColor 为库 prop 仅接受 hex：#002045 = primary，#ffffff = surface-container-lowest */}
        <QRCodeSVG value={url} size={160} fgColor="#002045" bgColor="#ffffff" level="M" />
      </div>

      {/* 文案 */}
      <p className="mt-4 text-center text-[13px] text-on-surface-variant">
        打开手机微信，扫一扫二维码
      </p>
      <p className="mt-1 text-center text-[12px] text-on-surface-variant/60">
        即可转发给好友或分享到朋友圈
      </p>

      {/* 复制链接（次按钮：ghost + 1px 边框），成功后绿色反馈 */}
      {clipboardOk && (
        <button
          type="button"
          onClick={handleCopy}
          className={`mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded border text-[13px] font-medium transition-colors ${
            copied
              ? 'border-secondary text-secondary bg-secondary-container/30'
              : 'border-outline-variant text-primary hover:bg-surface-container'
          }`}
        >
          {copied ? <FaCheck size={13} /> : <FaLink size={13} />}
          {copied ? '已复制' : '复制链接'}
        </button>
      )}

      {/* 移动端附加提示（桌面隐藏） */}
      <p className="mt-3 text-center text-[12px] text-on-surface-variant/60 sm:hidden">
        也可截图后，在微信扫一扫中从相册识别
      </p>
    </div>
  );

  return (
    <div ref={containerRef} className="relative">
      {/* ---- 微信图标按钮（分隔线 + 圆形 hover 底） ---- */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="分享到微信"
        aria-expanded={open}
        title="分享到微信"
        className="group flex items-center"
      >
        <span aria-hidden className="w-px h-4 bg-outline-variant/60 mr-3" />
        <span
          className={`flex items-center justify-center w-9 h-9 rounded-full transition-all duration-150 ${
            open ? 'bg-[#07C160]/10' : 'group-hover:bg-[#07C160]/10'
          }`}
        >
          <FaWeixin
            size={18}
            className={`text-[#07C160] transition-transform duration-150 ${
              open ? 'scale-110' : 'group-hover:scale-110'
            }`}
          />
        </span>
      </button>

      {/* ---- 桌面 popover（≥sm）：图标正下方右对齐，带上指箭头 ---- */}
      <div
        ref={popoverRef}
        aria-hidden={!open}
        className={`hidden sm:block absolute right-0 top-full mt-3 z-40 origin-top-right transition-all duration-150 ease-out ${
          open
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto'
            : 'opacity-0 -translate-y-1 scale-[0.98] pointer-events-none'
        }`}
      >
        <span
          aria-hidden
          className="absolute -top-1.5 right-4 w-3 h-3 rotate-45 border-l border-t border-outline-variant bg-surface-container-lowest"
        />
        {shareCard}
      </div>

      {/* ---- 移动模态（<sm）：半透明遮罩 + 居中卡片 ---- */}
      <div
        ref={modalRef}
        aria-hidden={!open}
        className={`sm:hidden fixed inset-0 z-50 flex items-center justify-center p-6 transition-opacity duration-200 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          data-testid="wechat-share-overlay"
          className="absolute inset-0 bg-primary/40"
          onClick={() => setOpen(false)}
        />
        <div
          className={`relative transition-transform duration-200 ${
            open ? 'scale-100' : 'scale-95'
          }`}
        >
          {shareCard}
        </div>
      </div>
    </div>
  );
}
