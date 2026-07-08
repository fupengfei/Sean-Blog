'use client';

import { useState } from 'react';
import { postMailContact } from '@/lib/api';
import ResumeModal from './ResumeModal';

export default function CTASection() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleSendMail = async () => {
    try {
      await postMailContact();
    } catch {
      // silently fail — still redirect to mailto
    } finally {
      window.location.href = 'mailto:sean@example.com';
    }
  };

  return (
    <>
      <section className="py-24 bg-primary text-white">
        <div className="max-w-[720px] mx-auto px-4 sm:px-6 lg:px-10 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-6">
            让我们在AI领域越陷越深
          </h2>
          <p className="text-base leading-relaxed text-white/70 mb-10 max-w-lg mx-auto">
            如果你对人工智能、软件开发或任何技术话题感兴趣，欢迎与我交流。
            无论是合作探讨、技术咨询，还是单纯的聊天，都很期待你的来信。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleSendMail}
              className="inline-flex items-center justify-center px-8 py-3 rounded bg-white text-primary font-medium text-sm transition-opacity hover:opacity-90"
            >
              发送邮件
            </button>
            <button
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center justify-center px-8 py-3 rounded border border-white/30 text-white font-medium text-sm transition-colors hover:bg-white/10"
            >
              获取简历
            </button>
          </div>
        </div>
      </section>

      <ResumeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
