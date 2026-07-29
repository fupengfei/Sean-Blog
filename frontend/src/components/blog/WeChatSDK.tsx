'use client';

// =============================================================================
// WeChatSDK — 微信公众号 JS-SDK 分享配置
// =============================================================================
// 在文章详情页初始化微信 JS-SDK，调用 updateTimelineShareData（朋友圈）
// 和 updateAppMessageShareData（好友）设置分享标题、描述和缩略图。
//
// 前置条件：
//   1. 微信公众号 AppID / AppSecret 已在后端配置
//   2. 网站域名已加入公众号 JS 接口安全域名
//   3. 后端 /api/v1/wechat/jsapi-signature 接口可用
//
// 工作流程：
//   1. 加载 jweixin-1.6.0.js（全局只加载一次）
//   2. 向后端请求当前页面的 JS-SDK 签名
//   3. 调用 wx.config() 注入权限验证配置
//   4. wx.ready() 回调中设置分享数据
// =============================================================================

import { useEffect, useRef } from 'react';

/** 全局标记：WeChat JS-SDK 脚本是否已开始加载 */
let scriptLoading = false;
/** 全局标记：WeChat JS-SDK 脚本是否已加载完成 */
let scriptLoaded = false;
/** 等待脚本加载完成的回调队列 */
const readyCallbacks: Array<() => void> = [];

/**
 * 动态加载微信 JS-SDK 脚本（全局只加载一次）。
 * 加载完成后依次执行所有等待中的回调。
 */
function loadWechatScript(): Promise<void> {
  return new Promise((resolve) => {
    if (scriptLoaded) {
      resolve();
      return;
    }
    readyCallbacks.push(resolve);
    if (scriptLoading) return;
    scriptLoading = true;

    const script = document.createElement('script');
    script.src = '//res.wx.qq.com/open/js/jweixin-1.6.0.js';
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      readyCallbacks.forEach((cb) => cb());
      readyCallbacks.length = 0;
    };
    script.onerror = () => {
      // 加载失败也 resolve，避免阻塞；后续 wx 全局变量不存在会被静默跳过
      scriptLoaded = true;
      readyCallbacks.forEach((cb) => cb());
      readyCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

// ---------------------------------------------------------------------------
// 类型声明：微信 JS-SDK 全局变量 wx
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    wx?: {
      config: (opts: {
        debug: boolean;
        appId: string;
        timestamp: string;
        nonceStr: string;
        signature: string;
        jsApiList: string[];
      }) => void;
      ready: (cb: () => void) => void;
      error: (cb: (err: unknown) => void) => void;
      updateTimelineShareData: (opts: WechatShareConfig) => void;
      updateAppMessageShareData: (opts: WechatShareConfig) => void;
      onMenuShareTimeline: (opts: WechatShareConfig) => void;
      onMenuShareAppMessage: (opts: WechatShareConfig) => void;
    };
  }
}

interface WechatShareConfig {
  title: string;
  desc: string;
  link: string;
  imgUrl: string;
  success?: () => void;
  cancel?: () => void;
}

// ---------------------------------------------------------------------------
// 组件 Props
// ---------------------------------------------------------------------------

interface WeChatSDKProps {
  /** 分享标题（文章标题） */
  title: string;
  /** 分享描述（文章摘要） */
  description: string;
  /** 分享缩略图（绝对 URL，建议 300x300 以上） */
  imageUrl: string;
}

/**
 * 微信 JS-SDK 初始化组件。
 *
 * 在页面中渲染此组件后，自动完成 SDK 加载、签名获取和分享数据配置。
 * 仅在微信内置浏览器中生效（wx 对象由微信客户端注入，外部浏览器无此对象，
 * 但通过后端签名仍可正常调用 wx.config）。
 */
export default function WeChatSDK({ title, description, imageUrl }: WeChatSDKProps) {
  const configuredRef = useRef(false);

  useEffect(() => {
    // 防止 React StrictMode 双重调用
    if (configuredRef.current) return;
    configuredRef.current = true;

    let cancelled = false;

    async function init() {
      // 1. 加载微信 JS-SDK 脚本
      await loadWechatScript();

      if (cancelled) return;
      if (typeof window === 'undefined' || !window.wx) {
        console.warn('[WeChatSDK] wx global not available — not in WeChat browser');
        return;
      }

      // 2. 获取当前页面 URL（不含 hash，微信签名要求）
      const url = window.location.href.split('#')[0];

      // 3. 向后端请求签名
      let signData: { appId: string; timestamp: string; nonceStr: string; signature: string } | null = null;
      try {
        const resp = await fetch(`/api/v1/wechat/jsapi-signature?url=${encodeURIComponent(url)}`);
        if (!resp.ok) {
          console.error('[WeChatSDK] Signature API returned', resp.status);
          return;
        }
        const json = await resp.json();
        if (json.code !== 200 || !json.data) {
          console.error('[WeChatSDK] Signature API error:', json.message);
          return;
        }
        signData = json.data;
      } catch (err) {
        console.error('[WeChatSDK] Failed to fetch signature:', err);
        return;
      }

      if (cancelled || !signData) return;

      // 4. 注入权限验证配置
      window.wx.config({
        debug: false,
        appId: signData.appId,
        timestamp: signData.timestamp,
        nonceStr: signData.nonceStr,
        signature: signData.signature,
        jsApiList: [
          'updateTimelineShareData',
          'updateAppMessageShareData',
          'onMenuShareTimeline',
          'onMenuShareAppMessage',
        ],
      });

      // 5. wx.ready 后设置分享数据
      const shareLink = window.location.href.split('#')[0];
      const shareConfig: WechatShareConfig = {
        title: title || '',
        desc: description || '',
        link: shareLink,
        imgUrl: imageUrl || '',
      };

      window.wx.ready(() => {
        if (cancelled) return;
        try {
          // 新版 API（推荐）
          window.wx!.updateTimelineShareData(shareConfig);
          window.wx!.updateAppMessageShareData(shareConfig);
        } catch {
          // 降级到旧版 API
          try {
            window.wx!.onMenuShareTimeline(shareConfig);
            window.wx!.onMenuShareAppMessage(shareConfig);
          } catch {
            // 静默失败
          }
        }
      });

      window.wx.error((err: unknown) => {
        console.error('[WeChatSDK] wx.config error:', err);
      });
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [title, description, imageUrl]);

  // 纯逻辑组件，不渲染任何 DOM
  return null;
}
