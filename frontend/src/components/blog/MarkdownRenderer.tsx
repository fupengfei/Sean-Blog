'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import MermaidBlock from './MermaidBlock';

interface MarkdownRendererProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) return children.map(extractTextFromChildren).join('');
  if (children && typeof children === 'object' && 'props' in children) {
    return extractTextFromChildren((children as React.ReactElement).props.children);
  }
  return '';
}

/**
 * Markdown 渲染组件
 *
 * 将 Markdown 内容渲染为样式化的 HTML，是文章详情页的核心展示组件。
 *
 * 使用 `react-markdown` + 插件生态：
 * - `remark-gfm`：GitHub Flavored Markdown（表格、任务列表等）
 * - `remark-math`：数学公式支持
 * - `rehype-katex`：KaTeX 数学公式渲染
 * - `rehype-highlight`：代码语法高亮
 *
 * 自定义组件覆盖：
 * - **标题（h1-h6）**：自动生成 id 锚点（通过 `slugify()` 处理中英文），带底部边框和适当间距
 * - **Mermaid 图表**：识别 `language-mermaid` 代码块，委托给 MermaidBlock 组件渲染
 * - **代码块**：区分行内代码和块级代码，块级使用深色背景主题
 * - **链接**：外部链接自动添加 `target="_blank"` 和 `rel="noopener noreferrer"`
 * - **表格**：容器可横向滚动（overflow-x-auto），表头有浅色背景
 * - **图片**：包裹在 figure 元素中，带圆角边框，底部可选 caption
 *
 * 最大宽度限制为 720px，匹配设计系统的文章列宽。
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="prose-custom font-body text-[20px] leading-[32px] max-sm:text-[18px] max-sm:leading-[28px] text-on-surface max-w-[720px]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          h1: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h1
                id={id}
                className="font-display text-[28px] sm:text-[32px] font-bold text-primary mt-10 mb-4 pb-2 border-b border-outline-variant leading-tight"
                {...props}
              >
                {children}
              </h1>
            );
          },
          h2: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h2
                id={id}
                className="font-display text-[24px] sm:text-[28px] font-bold text-primary mt-10 mb-4 pb-2 border-b border-[#EDF2F7] leading-tight"
                {...props}
              >
                {children}
              </h2>
            );
          },
          h3: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h3
                id={id}
                className="font-display text-[18px] sm:text-[20px] font-semibold text-primary mt-8 mb-3 leading-snug"
                {...props}
              >
                {children}
              </h3>
            );
          },
          h4: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h4
                id={id}
                className="font-display text-[16px] sm:text-[18px] font-semibold text-primary mt-6 mb-2 leading-snug"
                {...props}
              >
                {children}
              </h4>
            );
          },
          h5: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h5
                id={id}
                className="font-display text-[15px] font-semibold text-primary mt-5 mb-1.5 leading-snug"
                {...props}
              >
                {children}
              </h5>
            );
          },
          h6: ({ children, ...props }) => {
            const text = extractTextFromChildren(children);
            const id = slugify(text);
            return (
              <h6
                id={id}
                className="font-display text-[14px] font-semibold text-primary mt-4 mb-1.5 leading-snug"
                {...props}
              >
                {children}
              </h6>
            );
          },
          p: ({ children }) => (
            <p className="mb-6">{children}</p>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-secondary underline underline-offset-2 hover:text-secondary/80 transition-colors"
              target={href?.startsWith('http') ? '_blank' : undefined}
              rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-6 mb-6 space-y-1.5">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-6 mb-6 space-y-1.5">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="pl-1">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-6 italic text-on-surface-variant my-8">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-10 border-t border-outline-variant" />
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-6">
              <table className="min-w-full border-collapse border border-outline-variant text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-surface-container-low">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="border border-outline-variant px-4 py-2.5 text-left font-semibold font-display text-primary text-[14px]">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-outline-variant px-4 py-2.5 text-[15px]">
              {children}
            </td>
          ),
          img: ({ src, alt }) => (
            <figure className="my-8 rounded-xl overflow-hidden border border-outline-variant">
              <img
                src={src}
                alt={alt ?? ''}
                className="w-full h-auto"
                loading="lazy"
              />
              {alt && (
                <figcaption className="bg-surface-container-low px-4 py-3 text-center font-display text-[12px] tracking-[0.05em] font-semibold text-on-surface-variant italic">
                  {alt}
                </figcaption>
              )}
            </figure>
          ),
          pre: ({ children }) => (
            <pre className="rounded-lg overflow-x-auto my-8">
              {children}
            </pre>
          ),
          code: ({ className, children, ...props }) => {
            // Mermaid diagram block — render via dynamic-imported component (ssr: false)
            if (className && className.includes('language-mermaid')) {
              const rawCode = extractTextFromChildren(children).trim();
              return <MermaidBlock code={rawCode} />;
            }

            const codeString = String(children).replace(/\n$/, '');

            // Block code: either has hljs class (language specified) or contains newlines
            const isBlock = className !== undefined || codeString.includes('\n');
            if (isBlock) {
              // Fallback styling when no language is specified (no hljs class)
              const blockClass = className || 'block bg-[#282c34] text-[#abb2bf] text-[14px] leading-relaxed p-6 font-mono';
              return (
                <code className={blockClass} {...props}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-surface-container text-secondary text-[0.9em] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-primary">{children}</strong>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
