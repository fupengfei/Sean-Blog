'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose prose-lg max-w-[720px] mx-auto">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          img: ({ src, alt }) => (
            <img
              src={src}
              alt={alt}
              className="w-full h-auto rounded-lg my-8"
              loading="lazy"
            />
          ),
          pre: ({ children }) => (
            <pre className="rounded-lg overflow-x-auto my-6">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            // Inline code vs block code: rehype-highlight adds className for block code
            const isBlock = className !== undefined;
            if (isBlock) {
              return (
                <code className={className} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code className="px-1.5 py-0.5 rounded bg-surface-container text-secondary text-sm" {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
