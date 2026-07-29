'use client';

// =============================================================================
// WeChatPCShare — PC 微信 OpenSDK 分享按钮
// =============================================================================
// 调用 wxopensdk.shareLink() 在 PC 上直接弹出微信分享窗口，不需要扫码。
//
// 前置条件：
//   1. 已在 open.weixin.qq.com 注册网站应用并通过审核
//   2. 已配置业务域名
//   3. 后端 POST /api/v1/wechat/pc-ticket 接口可用
//   4. PC 已安装微信 4.1.0+ 并登录
//
// 与 WeChatSDK 的区别：
//   - WeChatSDK：移动端被动拦截分享菜单（wx.config + updateTimelineShareData）
//   - WeChatPCShare：PC 端主动触发分享窗口（wxopensdk.shareLink + ticket）
// =============================================================================

import { useState } from 'react';
import { FaWeixin } from 'react-icons/fa';

/** 全局标记：PC OpenSDK 脚本是否已开始加载 */
let pcScriptLoading = false;
/** 全局标记：PC OpenSDK 脚本是否已加载完成 */
let pcScriptLoaded = false;
/** 等待脚本加载完成的回调队列 */
const pcReadyCallbacks: Array<() => void> = [];

declare global {
  interface Window {
    wxopensdk?: {
      onReady: (cb: () => void) => void;
      shareLink: (opts: {
        url: string;
        txt: string;
        desc: string;
        appid: string;
        thumburl: string;
        scene: string;
        ticket: string;
      }) => void;
    };
  }
}

/**
 * 动态加载 PC OpenSDK 脚本（全局只加载一次）
 */
function loadPcOpenSdk(): Promise<void> {
  return new Promise((resolve) => {
    if (pcScriptLoaded) {
      resolve();
      return;
    }
    pcReadyCallbacks.push(resolve);
    if (pcScriptLoading) return;
    pcScriptLoading = true;

    const script = document.createElement('script');
    script.src = 'https://res.wx.qq.com/connect/zh_CN/htmledition/js/wxopensdk.js';
    script.async = true;
    script.onload = () => {
      pcScriptLoaded = true;
      pcReadyCallbacks.forEach((cb) => cb());
      pcReadyCallbacks.length = 0;
    };
    script.onerror = () => {
      pcScriptLoaded = true;
      pcReadyCallbacks.forEach((cb) => cb());
      pcReadyCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// 组件 Props
// ---------------------------------------------------------------------------

interface WeChatPCShareProps {
  /** 分享标题 */
  title: string;
  /** 分享描述 */
  description: string;
  /** 分享缩略图（绝对 HTTPS URL，建议 300x300+） */
  imageUrl: string;
}

/**
 * PC 微信一键分享按钮。
 *
 * 点击后直接拉起 PC 微信「发送给朋友」/「分享到朋友圈」窗口，
 * 无需扫码。仅在安装了微信 4.1.0+ 的 PC 上生效。
 */
export default function WeChatPCShare({ title, description, imageUrl }: WeChatPCShareProps) {
  const [sharing, setSharing] = useState(false);
  const [done, setDone] = useState(false);

  const handleShare = async (scene: 'chat' | 'timeline') => {
    setSharing(true);

    try {
      // 1. 加载 PC OpenSDK 脚本
      await loadPcOpenSdk();

      if (!window.wxopensdk) {
        alert('未检测到微信 PC 客户端，请确认已安装微信 4.1.0 以上版本并登录。');
        setSharing(false);
        return;
      }

      // 2. 获取单次 ticket
      const resp = await fetch('/api/v1/wechat/pc-ticket', { method: 'POST' });
      if (!resp.ok) {
        alert('获取分享凭证失败，请稍后重试。');
        setSharing(false);
        return;
      }
      const json = await resp.json();
      if (json.code !== 200 || !json.data?.ticket) {
        alert('获取分享凭证失败：' + (json.message || '未知错误'));
        setSharing(false);
        return;
      }
      const ticket = json.data.ticket;

      // 3. 等待 SDK ready
      window.wxopensdk.onReady(() => {
        window.wxopensdk!.shareLink({
          url: window.location.href.split('#')[0],
          txt: title || '',
          desc: description || '',
          appid: json.data.appId || '',
          thumburl: imageUrl || '',
          scene,
          ticket,
        });
        setSharing(false);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      });
    } catch {
      alert('分享失败，请稍后重试。');
      setSharing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* 发送给朋友 */}
      <button
        type="button"
        onClick={() => handleShare('chat')}
        disabled={sharing}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium transition-colors ${
          done
            ? 'bg-[#07C160]/10 text-[#07C160]'
            : 'border border-outline-variant text-primary hover:bg-surface-container'
        }`}
        title="PC 微信发送给朋友"
      >
        <FaWeixin size={14} className="text-[#07C160]" />
        {sharing ? '拉起中...' : done ? '已发送' : '发送给朋友'}
      </button>

      {/* 分享到朋友圈 */}
      <button
        type="button"
        onClick={() => handleShare('timeline')}
        disabled={sharing}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-[13px] font-medium border border-outline-variant text-primary hover:bg-surface-container transition-colors"
        title="PC 微信分享到朋友圈"
      >
        <svg className="w-3.5 h-3.5 text-[#07C160]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        {sharing ? '拉起中...' : '分享到朋友圈'}
      </button>
    </div>
  );
}
