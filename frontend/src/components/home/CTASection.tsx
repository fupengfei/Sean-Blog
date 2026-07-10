'use client';

import { useState } from 'react';
import ResumeModal from './ResumeModal';
import MailModal from './MailModal';

export default function CTASection() {
  const [resumeModalOpen, setResumeModalOpen] = useState(false);
  const [mailModalOpen, setMailModalOpen] = useState(false);

  return (
    <>
      <section className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-10 mb-24">
        <div className="bg-primary p-12 md:p-20 text-center rounded-2xl relative overflow-hidden">
          {/* Decorative blur circles */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary rounded-full blur-3xl -ml-32 -mb-32" />
          </div>

          <h2 className="text-2xl sm:text-[32px] font-bold leading-tight sm:leading-[40px] tracking-[-0.01em] text-on-primary mb-6 relative z-10">
            让我们在AI领域越陷越深
          </h2>
          <p className="text-on-primary-container max-w-xl mx-auto mb-10 text-lg relative z-10">
            如果你对人工智能、软件开发或任何技术话题感兴趣，欢迎与我交流。无论是合作探讨、技术咨询，还是单纯的聊天，都很期待你的来信。
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 relative z-10">
            <button
              onClick={() => setMailModalOpen(true)}
              className="border border-on-primary text-on-primary px-10 py-4 rounded-lg text-base font-medium hover:bg-white/10 transition-all"
            >
              发送邮件
            </button>
            <button
              onClick={() => setResumeModalOpen(true)}
              className="border border-on-primary text-on-primary px-10 py-4 rounded-lg text-base font-medium hover:bg-white/10 transition-all"
            >
              获取简历
            </button>
          </div>
        </div>
      </section>

      <MailModal open={mailModalOpen} onClose={() => setMailModalOpen(false)} />
      <ResumeModal open={resumeModalOpen} onClose={() => setResumeModalOpen(false)} />
    </>
  );
}
