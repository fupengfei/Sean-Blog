'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './ChatProvider';
import { useChat } from './ChatProvider';

/**
 * MessageBubble — 单条聊天消息气泡
 *
 * 用户消息（role === 'user'）：
 * - 右对齐，浅灰背景 surface-container-low
 * - max-w-[80%]，rounded-lg
 *
 * AI 消息（role === 'assistant'）：
 * - 左对齐，无背景纯文字
 * - max-w-[85%]
 * - 用 react-markdown 渲染 Markdown（加粗、链接、代码）
 * - 流式输出时末尾显示闪烁光标 ▊
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
  const showCursor = isLastAssistant && isStreaming;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`
          px-3 py-2 text-sm leading-relaxed
          ${isUser
            ? 'bg-surface-container-low rounded-lg max-w-[80%] text-on-surface'
            : 'max-w-[85%] text-on-surface'
          }
        `}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className={`prose prose-sm max-w-none prose-p:my-1 prose-a:text-primary prose-code:text-sm prose-code:bg-surface-container-low prose-code:px-1 prose-code:rounded ${message.content.startsWith('⚠️') ? 'text-red-500' : ''}`}>
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
