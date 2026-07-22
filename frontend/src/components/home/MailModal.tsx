'use client';

import { useState } from 'react';
import { postMailContact } from '@/lib/api';

/**
 * 发送邮件弹窗 Props
 */
interface MailModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 发送邮件模态框
 *
 * 用户填写邮箱地址和邮件内容，提交后记录到后端 Contact 表（type=MAIL）。
 *
 * 状态流转：
 * - **表单态**：邮箱 + 内容输入框 + 发送/取消按钮
 * - **提交中**：按钮显示「发送中...」并禁用
 * - **成功态**：绿色勾号 + 成功提示，2 秒后自动关闭并重置表单
 *
 * 失败时静默处理（`silently fail`），不打断用户操作流。
 */
export default function MailModal({ open, onClose }: MailModalProps) {
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await postMailContact(email.trim(), content.trim());
      setDone(true);
      setTimeout(() => {
        onClose();
        setDone(false);
        setEmail('');
        setContent('');
      }, 2000);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative z-10 w-full max-w-md mx-4 bg-white rounded-lg border border-outline-variant p-8 shadow-lg">
        {done ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-secondary-container flex items-center justify-center">
              <svg
                className="w-8 h-8 text-secondary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <p className="text-lg font-semibold text-primary">发送成功</p>
            <p className="text-sm text-on-surface-variant mt-2">
              邮件已发送，我会尽快回复
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-primary mb-6">
              发送邮件
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="mailEmail"
                  className="block text-sm font-medium text-on-surface mb-1.5"
                >
                  邮箱
                </label>
                <input
                  id="mailEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入您的邮箱地址"
                  className="w-full px-4 py-2.5 rounded border border-outline-variant bg-white text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="mailContent"
                  className="block text-sm font-medium text-on-surface mb-1.5"
                >
                  邮件内容
                </label>
                <textarea
                  id="mailContent"
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="请输入邮件内容..."
                  className="w-full px-4 py-2.5 rounded border border-outline-variant bg-white text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 rounded border border-outline text-on-surface-variant text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  取消
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2.5 rounded bg-primary text-white text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {submitting ? '发送中...' : '发送'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
