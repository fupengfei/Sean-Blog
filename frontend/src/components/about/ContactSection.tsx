'use client';

import { useState, type FormEvent } from 'react';
import { postBusinessContact } from '@/lib/api';

type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactSection() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<FormStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim()) {
      setErrorMsg('请填写姓名和邮箱');
      setStatus('error');
      return;
    }

    setStatus('submitting');
    setErrorMsg('');

    try {
      await postBusinessContact(name.trim(), email.trim(), message.trim());
      setStatus('success');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: unknown) {
      setStatus('error');
      if (err instanceof Error) {
        setErrorMsg(err.message || '提交失败，请稍后重试');
      } else {
        setErrorMsg('提交失败，请稍后重试');
      }
    }
  };

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText('fpfos@hotmail.com');
    } catch {
      // fallback
      const input = document.createElement('input');
      input.value = 'fpfos@hotmail.com';
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-16 md:py-24">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="bg-primary text-white rounded-2xl relative overflow-hidden flex flex-col lg:flex-row">
          {/* Left: Info & Decoration */}
          <div className="lg:w-2/5 p-10 md:p-14 flex flex-col justify-between relative">
            {/* Dot pattern background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  'radial-gradient(rgb(255 255 255 / 0.8) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />
            <div className="relative z-10">
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6 leading-tight">
                期待与您的
                <br />
                思想碰撞
              </h2>
              <p className="text-sm leading-relaxed mb-12 opacity-80 max-w-xs">
                我目前正在寻找令人兴奋的新机会或合作。无论是项目咨询、技术交流还是获取简历，我都非常乐意倾听。
              </p>
            </div>
            <div className="relative z-10 space-y-5 pt-10 border-t border-white/20">
              {/* Email — click to copy */}
              <button
                onClick={handleCopyEmail}
                className="flex items-center gap-3 group cursor-pointer text-left hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-[18px] h-[18px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                    />
                  </svg>
                </div>
                <div>
                  <span className="text-sm">fpfos@hotmail.com</span>
                  {copied ? (
                    <span className="ml-2 text-xs text-green-300">已复制 ✓</span>
                  ) : (
                    <span className="ml-2 text-xs text-white/40 group-hover:text-white/60 transition-colors">
                      点击复制
                    </span>
                  )}
                </div>
              </button>
              {/* Location */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-[18px] h-[18px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 0115 0z"
                    />
                  </svg>
                </div>
                <span className="text-sm">上海 · 中国</span>
              </div>
            </div>
          </div>

          {/* Right: Contact Form */}
          <div className="lg:w-3/5 p-10 md:p-14 bg-primary">
            {status === 'success' ? (
              /* Success — 与 NewsletterSection 风格一致 */
              <div className="max-w-xl mx-auto rounded-xl border border-white/20 bg-white/5 px-8 py-10 text-center">
                <p className="text-on-primary font-medium text-lg mb-2">感谢留言！</p>
                <p className="text-on-primary-container/60 text-sm">
                  已收到您的合作意向，我会尽快通过邮件与您联系。
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="mt-6 px-6 py-2 text-sm rounded-lg border border-white/20 text-white hover:bg-white/10 transition-colors"
                >
                  继续留言
                </button>
              </div>
            ) : (
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit}>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="name"
                    className="text-[12px] font-bold uppercase tracking-widest text-white/60"
                  >
                    您的姓名
                  </label>
                  <input
                    id="name"
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-transparent border-b border-white/20 focus:border-secondary outline-none py-2 text-white placeholder-white/20 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="email"
                    className="text-[12px] font-bold uppercase tracking-widest text-white/60"
                  >
                    邮箱地址
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-transparent border-b border-white/20 focus:border-secondary outline-none py-2 text-white placeholder-white/20 transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-2 md:col-span-2">
                  <label
                    htmlFor="message"
                    className="text-[12px] font-bold uppercase tracking-widest text-white/60"
                  >
                    合作详情
                  </label>
                  <textarea
                    id="message"
                    placeholder="请简要描述您的项目需求或合作意向..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="bg-transparent border-b border-white/20 focus:border-secondary outline-none py-2 text-white placeholder-white/20 resize-none min-h-[100px] transition-colors"
                  />
                </div>
                <div className="md:col-span-2 pt-4">
                  <button
                    type="submit"
                    disabled={status === 'submitting'}
                    className={`flex items-center justify-center gap-2 px-10 py-4 text-sm font-medium rounded-lg transition-all active:scale-[0.98] group ${
                      status === 'submitting'
                        ? 'opacity-70 cursor-not-allowed bg-secondary/70'
                        : 'bg-secondary text-white hover:bg-secondary/90'
                    }`}
                  >
                    {status === 'submitting' ? (
                      <>
                        <svg
                          className="w-5 h-5 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        提交中...
                      </>
                    ) : (
                      <>
                        提交意向
                        <svg
                          className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                  {status === 'error' && (
                    <p className="text-red-300 text-xs mt-2 text-center">{errorMsg}</p>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
