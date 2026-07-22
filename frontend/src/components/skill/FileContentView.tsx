'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

/** 文件内容视图 Props */
interface FileContentViewProps {
  /** 当前选中文件的路径，null 表示未选择 */
  filePath: string | null;
  /** 文件内容字符串，null 表示无内容 */
  content: string | null;
  /** 是否正在加载 */
  loading: boolean;
}

const CODE_EXTENSIONS = new Set([
  'js', 'ts', 'jsx', 'tsx', 'java', 'xml', 'json', 'yml', 'yaml', 'css', 'html',
  'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'sh', 'bash', 'sql', 'graphql',
  'mdx', 'toml', 'ini', 'cfg', 'env', 'dockerfile', 'makefile',
]);

const IMAGE_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp',
]);

function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * 文件内容查看器
 *
 * Skill 详情页右侧的内容展示面板，根据文件类型智能选择渲染方式。
 *
 * 渲染策略（`renderContent()`）：
 * - **Markdown（.md）**：使用 react-markdown 渲染为富文本
 * - **代码文件**（js/ts/java/py 等）：使用 Prism 语法高亮 + 行号
 * - **图片**（png/jpg/svg 等）：以 base64 方式展示
 * - **大文件**（content > 200KB）：显示不支持预览提示
 * - **其他**：纯文本 fallback（等宽字体 + 自动换行）
 *
 * 四种展示状态：
 * - **未选择文件**：提示「请从左侧选择文件」
 * - **加载中**：旋转加载动画
 * - **无内容**：提示「无法加载文件内容」
 * - **正常展示**：文件头部（文件名 + 扩展名）+ 内容区
 */
export default function FileContentView({ filePath, content, loading }: FileContentViewProps) {
  // No file selected
  if (!filePath) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <svg
          className="w-16 h-16 text-outline-variant mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <p className="text-sm text-on-surface-variant">请从左侧选择文件</p>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-on-surface-variant">加载中...</p>
      </div>
    );
  }

  // No content
  if (content === null || content === undefined) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-16">
        <p className="text-sm text-on-surface-variant">无法加载文件内容</p>
      </div>
    );
  }

  const ext = getExtension(filePath);
  const fileName = filePath.split('/').pop() || filePath;

  return (
    <div className="h-full flex flex-col">
      {/* File header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-outline-variant bg-surface-container-low flex-shrink-0">
        <svg
          className="w-4 h-4 text-on-surface-variant flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
        <span className="text-sm font-medium text-on-surface truncate">{fileName}</span>
        {ext && (
          <span className="text-xs text-on-surface-variant/60 uppercase flex-shrink-0">{ext}</span>
        )}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderContent(filePath, content, ext)}
      </div>
    </div>
  );
}

function renderContent(filePath: string, content: string, ext: string): React.ReactNode {
  // Markdown
  if (ext === 'md') {
    return (
      <div className="prose prose-slate max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    );
  }

  // Code files
  if (CODE_EXTENSIONS.has(ext)) {
    const langMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'jsx',
      tsx: 'tsx',
      java: 'java',
      xml: 'xml',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      css: 'css',
      html: 'html',
      py: 'python',
      rb: 'ruby',
      go: 'go',
      rs: 'rust',
      c: 'c',
      cpp: 'cpp',
      h: 'c',
      hpp: 'cpp',
      sh: 'bash',
      bash: 'bash',
      sql: 'sql',
      graphql: 'graphql',
      mdx: 'markdown',
      toml: 'toml',
      ini: 'ini',
      dockerfile: 'dockerfile',
      makefile: 'makefile',
    };

    return (
      <SyntaxHighlighter
        language={langMap[ext] || ext}
        style={oneDark}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
        showLineNumbers
      >
        {content}
      </SyntaxHighlighter>
    );
  }

  // Images
  if (IMAGE_EXTENSIONS.has(ext)) {
    return (
      <div className="flex items-center justify-center">
        <img
          src={`data:image/${ext === 'svg' ? 'svg+xml' : ext};base64,${content}`}
          alt={filePath}
          className="max-w-full max-h-[70vh] object-contain rounded-lg"
        />
      </div>
    );
  }

  // Check file size (content length > 200KB)
  if (content.length > 200 * 1024) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="w-12 h-12 text-outline-variant mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
        <p className="text-sm text-on-surface-variant">不支持预览此文件类型</p>
        <p className="text-xs text-on-surface-variant/50 mt-1">.{ext} 文件过大或格式不支持</p>
      </div>
    );
  }

  // Plain text fallback
  return (
    <pre className="text-sm font-mono text-on-surface bg-surface-container-low rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">
      {content}
    </pre>
  );
}
