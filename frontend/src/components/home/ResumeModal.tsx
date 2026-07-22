'use client';

import { useState, Fragment } from 'react';
import { postResumeContact } from '@/lib/api';

/**
 * 获取简历弹窗 Props
 */
interface ResumeModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 获取简历模态框
 *
 * 用户填写公司名称和邮箱后提交请求，记录到后端 Contact 表（type=RESUME）。
 * 交互逻辑与 MailModal 一致：
 * - 表单态 → 提交中 → 成功态（2 秒后自动关闭）
 * - 失败静默处理
 */
export default function ResumeModal({ open, onClose }: ResumeModalProps) {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await postResumeContact(companyName, email);
      setDone(true);
      setTimeout(() => {
        onClose();
        setDone(false);
        setCompanyName('');
        setEmail('');
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
            <p className="text-lg font-semibold text-primary">提交成功</p>
            <p className="text-sm text-on-surface-variant mt-2">
              感谢你的关注，我们会尽快与你联系
            </p>
          </div>
        ) : (
          <>
            <h2 className="font-display text-xl font-semibold text-primary mb-6">
              获取简历
            </h2>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="companyName"
                  className="block text-sm font-medium text-on-surface mb-1.5"
                >
                  公司名称
                </label>
                <input
                  id="companyName"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="请输入公司名称"
                  className="w-full px-4 py-2.5 rounded border border-outline-variant bg-white text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-on-surface mb-1.5"
                >
                  邮箱
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="请输入邮箱地址"
                  className="w-full px-4 py-2.5 rounded border border-outline-variant bg-white text-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary transition-colors"
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
                  {submitting ? '提交中...' : '提交'}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
