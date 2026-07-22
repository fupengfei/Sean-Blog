'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './ChatProvider';
import { useChat } from './ChatProvider';

/**
 * MessageBubble — 单条聊天消息气泡
 *
 * 用户消息（role === 'user'）：
 * - 右对齐，主色半透明背景
 * - max-w-[80%]，rounded-2xl
 *
 * AI 消息（role === 'assistant'）：
 * - 左对齐，无背景纯文字
 * - max-w-[85%]
 * - 用 react-markdown 渲染 Markdown（加粗、链接、代码）
 * - 流式输出时末尾显示闪烁光标 ▊
 *
 * 行间距：leading-snug + 紧凑段落间距，在面板内展示更多内容
 *
 * @param message - 要渲染的消息对象
 * @param isLastAssistant - 是否为最后一条 AI 消息（控制光标显示）
 */
export default function MessageBubble({
  message,
  isLastAssistant,
}: {
  message: ChatMessage;
  isLastAssistant: boolean;
}) {
  const { isStreaming } = useChat();
  const isUser = message.role === 'user';
  const isEmpty = message.role === 'assistant' && !message.content;
  const isLoading = isEmpty && isStreaming && isLastAssistant;
  const showCursor = isLastAssistant && isStreaming && !isEmpty;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          px-3.5 py-2 text-sm
          ${isUser
            ? 'bg-[#002045]/8 rounded-2xl rounded-br-md max-w-[80%] text-on-surface'
            : 'max-w-[85%] text-on-surface'
          }
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words leading-snug">{message.content}</p>
        ) : isLoading ? (
          // 等待 AI 响应时的动态加载动画（三个依次弹跳的圆点）
          <span className="inline-flex gap-1 items-end h-5">
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </span>
        ) : (
          <div className={`prose prose-sm max-w-none leading-snug prose-p:my-0.5 prose-ul:my-0.5 prose-ol:my-0.5 prose-li:my-0 prose-a:text-primary prose-code:text-sm prose-code:bg-surface-container-low prose-code:px-1 prose-code:rounded ${message.content.startsWith('⚠️') ? 'text-red-500' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            {showCursor && (
              <span className="inline-block w-2 h-4 bg-primary animate-pulse align-text-bottom ml-0.5" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
