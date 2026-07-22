'use client';

import { useState } from 'react';
import { postSubscribeContact } from '@/lib/api';

/**
 * 邮件订阅区域（博客页底部 CTA）
 *
 * Primary-container 背景的全宽区域，包含：
 * - 「定期更新」徽章
 * - 订阅标题和描述
 * - 邮箱输入框 + 提交按钮（横向并排，移动端堆叠）
 *
 * 状态流转：
 * - **表单态**：邮箱输入 + 「立即加入」按钮
 * - **提交中**：按钮显示「提交中...」并禁用
 * - **成功态**：显示「感谢订阅！」成功提示 + 投递说明
 * - **错误态**：红色错误提示文字
 *
 * 提交后记录到后端 Contact 表（type=SUBSCRIBE）。
 */
export default function NewsletterSection() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await postSubscribeContact(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : '订阅失败，请稍后重试',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-primary-container py-24 px-4 sm:px-6 lg:px-10 text-center">
      <div className="max-w-3xl mx-auto">
        {/* Badge */}
        <div className="inline-block px-4 py-1 bg-white/10 text-on-primary-container text-xs font-semibold uppercase tracking-widest rounded-full mb-6">
          定期更新
        </div>

        {/* Title */}
        <h2 className="font-display text-3xl md:text-4xl font-bold text-on-primary mb-6">
          订阅技术专栏
        </h2>

        {/* Description */}
        <p className="text-on-primary-container/80 mb-10 max-w-xl mx-auto leading-relaxed">
          每两周一次，获取经过深度筛选的技术好文与架构心得。无广告，无垃圾邮件。
        </p>

        {/* Form */}
        {submitted ? (
          <div className="max-w-xl mx-auto rounded-xl border border-white/20 bg-white/5 px-8 py-6">
            <p className="text-on-primary font-medium text-lg mb-2">感谢订阅！</p>
            <p className="text-on-primary-container/60 text-sm">
              我们已收到您的邮箱，后续更新将第一时间送达。
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex flex-col md:flex-row gap-0 max-w-xl mx-auto overflow-hidden rounded-xl border border-white/20"
          >
            <input
              className="flex-grow px-6 py-4 bg-white/5 border-none focus:ring-0 text-white placeholder-white/40 font-medium outline-none"
              placeholder="您的工作邮箱地址"
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <button
              className="px-10 py-4 bg-secondary text-on-secondary font-medium hover:brightness-110 transition-all whitespace-nowrap disabled:opacity-60"
              type="submit"
              disabled={loading}
            >
              {loading ? '提交中...' : '立即加入'}
            </button>
          </form>
        )}

        {/* Error message */}
        {error && (
          <p className="mt-4 text-red-300 text-sm">{error}</p>
        )}

        {/* Privacy note */}
        <p className="mt-6 text-on-primary-container/40 text-[10px] font-semibold tracking-wider uppercase">
          点击订阅即表示您同意我们的《隐私政策》
        </p>
      </div>
    </section>
  );
}
