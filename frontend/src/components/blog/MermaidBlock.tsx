'use client';

import { useEffect, useState } from 'react';

interface MermaidBlockProps {
  code: string;
}

function MermaidPlaceholder() {
  return (
    <div className="my-8 rounded-xl border border-outline-variant bg-surface-container-low p-6 flex items-center justify-center">
      <span className="text-sm text-on-surface-variant">加载图表...</span>
    </div>
  );
}

export default function MermaidBlock({ code }: MermaidBlockProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: 'neutral',
          securityLevel: 'sandbox',
          fontFamily: 'Inter, sans-serif',
        });

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg: rendered } = await mermaid.render(id, code);
        if (!cancelled) {
          setSvg(rendered);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Mermaid render error:', err);
          setError('图表渲染失败，请检查 Mermaid 语法');
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error) {
    return (
      <div className="my-8 rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="font-display text-[13px] font-semibold text-red-600">{error}</span>
        </div>
        <pre className="text-[13px] text-red-700 bg-red-100 rounded p-3 overflow-x-auto font-mono leading-relaxed">
          {code}
        </pre>
      </div>
    );
  }

  if (!svg) {
    return <MermaidPlaceholder />;
  }

  return (
    <div
      className="my-8 flex justify-center overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-low p-6"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
