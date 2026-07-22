'use client';

import { useEffect, useRef } from 'react';
import { useChat } from './ChatProvider';
import MessageBubble from './MessageBubble';

/**
 * MessageList — 消息列表组件
 *
 * 功能：
 * - 渲染所有消息（从 ChatProvider 的 messages 数组）
 * - 新消息到达时自动滚动到底部（smooth 动画）
 * - 空消息内容不渲染（占位 assistant 消息在流式开始前）
 *
 * 滚动策略：
 * - messages 变化 → useEffect 触发 scrollIntoView
 * - 使用 ref 指向列表底部哨兵元素
 */
export default function MessageList() {
  const { messages } = useChat();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
      {messages.map((msg, index) => {
        const isLastAssistant =
          msg.role === 'assistant' &&
          index === messages.length - 1;

        return (
          <MessageBubble
            key={msg.id}
            message={msg}
            isLastAssistant={isLastAssistant}
          />
        );
      })}
      {/* Scroll anchor — invisible sentinel at bottom of list */}
      <div ref={bottomRef} />
    </div>
  );
}
