import { NextRequest } from 'next/server';

/**
 * AI 聊天 SSE 流式代理。
 *
 * 为什么不用 next.config.js 的 rewrite？
 * rewrite 底层是 http-proxy，会缓冲整个响应体，SSE 流式输出失效。
 * Route Handler 直接把后端的 ReadableStream 透传给浏览器，逐 chunk 到达。
 *
 * 优先级：App Router 文件路由 > rewrites，
 * 所以 /api/v1/ai/chat 走这里，其他 /api/v1/* 仍走 rewrite，互不影响。
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:8880';

export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendResponse = await fetch(`${BACKEND_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
  });

  // 后端出错时原样返回
  if (!backendResponse.ok || !backendResponse.body) {
    return new Response(backendResponse.body, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
    });
  }

  // 流式透传：把后端的 ReadableStream 直接交给浏览器
  return new Response(backendResponse.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // 告诉 nginx 这个响应不要缓冲
    },
  });
}
