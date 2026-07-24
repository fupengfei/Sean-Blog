'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from './ChatProvider';
import { useChat } from './ChatProvider';

// ---------------------------------------------------------------------------
// User avatar — 根据名字首字符生成彩色圆头像
// ---------------------------------------------------------------------------

/** 根据字符串哈希到固定颜色（同一个名字每次都是同一颜色） */
function avatarColor(name: string): string {
  const colors = [
    'bg-amber-500', 'bg-emerald-500', 'bg-sky-500', 'bg-violet-500',
    'bg-rose-500', 'bg-teal-500', 'bg-orange-500', 'bg-indigo-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function UserAvatar({ name }: { name: string }) {
  const initial = name.charAt(0);
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white ${avatarColor(name)}`}
      aria-hidden
    >
      {initial}
    </span>
  );
}

// ---------------------------------------------------------------------------
// MessageBubble
// ---------------------------------------------------------------------------

/**
 * MessageBubble — 单条聊天消息气泡（含头像 + 用户名）
 *
 * 用户消息（role === 'user'）：
 * - 右上角：用户名 + 彩色首字头像，右对齐
 * - 气泡：主色半透明背景，max-w-[80%]，rounded-2xl rounded-br-md
 *
 * AI 消息（role === 'assistant'）：
 * - 左上角：Logo 头像 + "Sean's AI 助手"，左对齐
 * - 气泡：无背景纯文字，max-w-[85%]
 * - 用 react-markdown 渲染 Markdown
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
  const { isStreaming, userName } = useChat();
  const isUser = message.role === 'user';
  const isEmpty = message.role === 'assistant' && !message.content;
  const isLoading = isEmpty && isStreaming && isLastAssistant;
  const showCursor = isLastAssistant && isStreaming && !isEmpty;

  return (
    <div className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}>
      {/* ---- 头像 + 名称行 ---- */}
      <div className={`flex items-center gap-1.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {isUser ? (
          // 用户头像：名字首字 + 彩色背景
          <UserAvatar name={userName} />
        ) : (
          // AI 头像：Logo
          <img
            src="/logo.png"
            alt="Sean's AI"
            className="h-5 w-5 rounded object-contain"
          />
        )}
        <span className="text-[11px] font-medium text-on-surface/50 leading-none">
          {isUser ? userName : "Sean's AI 助手"}
        </span>
      </div>

      {/* ---- 消息内容气泡 ---- */}
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
