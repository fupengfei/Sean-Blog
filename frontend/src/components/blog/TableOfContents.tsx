'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  content: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w一-鿿]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractToc(markdown: string): TocItem[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/;
  const items: TocItem[] = [];
  let inCodeBlock = false;

  for (const line of markdown.split('\n')) {
    if (/^(```|~~~)/.test(line.trimStart())) {
      inCodeBlock = !inCodeBlock;
      continue;
    }
    if (inCodeBlock) continue;

    const match = headingRegex.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2]
      .trim()
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      .replace(/_([^_]+)_/g, '$1');
    const id = slugify(text);
    items.push({ id, text, level });
  }
  return items;
}

/** Build a tree structure from flat TOC items */
interface TocTreeNode extends TocItem {
  children: TocTreeNode[];
}

function buildTocTree(items: TocItem[]): TocTreeNode[] {
  const roots: TocTreeNode[] = [];
  const stack: TocTreeNode[] = [];

  for (const item of items) {
    const node: TocTreeNode = { ...item, children: [] };

    while (stack.length > 0 && stack[stack.length - 1].level >= item.level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      stack[stack.length - 1].children.push(node);
    }

    stack.push(node);
  }

  return roots;
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const tocItems = useMemo(() => extractToc(content), [content]);
  const tocTree = useMemo(() => buildTocTree(tocItems), [tocItems]);
  const [activeId, setActiveId] = useState<string>('');

  const handleClick = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 100;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      history.replaceState(null, '', `#${id}`);
    }
  }, []);

  useEffect(() => {
    if (tocItems.length === 0) return;

    const headingElements = tocItems
      .map((item) => document.getElementById(item.id))
      .filter(Boolean) as HTMLElement[];

    if (headingElements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        } else {
          const aboveViewport = entries
            .filter((e) => e.boundingClientRect.top < 0)
            .sort((a, b) => b.boundingClientRect.top - a.boundingClientRect.top);
          if (aboveViewport.length > 0) {
            setActiveId(aboveViewport[0].target.id);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 },
    );

    headingElements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [tocItems]);

  if (tocItems.length === 0) return null;

  return (
    <nav className="sticky top-[120px] max-h-[calc(100vh-160px)] overflow-y-auto pl-8 border-l border-outline-variant">
      {/* Title */}
      <h4 className="font-display text-[14px] font-medium text-primary mb-6 uppercase tracking-[0.1em]">
        目录
      </h4>

      {/* TOC items */}
      <TocNodeList
        nodes={tocTree}
        activeId={activeId}
        onItemClick={handleClick}
      />
    </nav>
  );
}

/** Recursively render TOC nodes */
function TocNodeList({
  nodes,
  activeId,
  onItemClick,
  depth = 0,
}: {
  nodes: TocTreeNode[];
  activeId: string;
  onItemClick: (id: string) => void;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? 'pl-4 mt-3 space-y-3 border-l border-outline-variant ml-1' : 'space-y-3'}>
      {nodes.map((node) => {
        const isActive = activeId === node.id;
        return (
          <li key={node.id}>
            <button
              onClick={() => onItemClick(node.id)}
              className={`block w-full text-left text-[14px] leading-[20px] transition-colors duration-200 hover:text-primary ${
                isActive
                  ? 'text-primary font-medium'
                  : 'text-on-surface-variant'
              }`}
            >
              {node.text}
            </button>
            {node.children.length > 0 && (
              <TocNodeList
                nodes={node.children}
                activeId={activeId}
                onItemClick={onItemClick}
                depth={depth + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}
