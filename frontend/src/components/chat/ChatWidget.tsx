'use client';

import ChatButton from './ChatButton';
import ChatPanel from './ChatPanel';

/**
 * ChatWidget — 智能客服 UI 入口
 *
 * 这是 ChatWidget 的顶层组件，组装：
 * - ChatButton：始终渲染的右下角浮动按钮（点击切换开闭）
 * - ChatPanel：对话面板（通过 ChatPanel 内部 CSS transition 控制显示/隐藏）
 *
 * ChatPanel 始终挂载但通过 opacity + pointer-events 控制可见性。
 *
 * 关闭 vs 最小化语义：
 * - 关闭（closeChat）：中断流并清空对话，下次打开从欢迎语重新开始
 * - 最小化（minimizeChat）：仅隐藏面板，保留对话和进行中的流
 */
export default function ChatWidget() {
  return (
    <>
      <ChatButton />
      <ChatPanel />
    </>
  );
}
