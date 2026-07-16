'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';

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

  // Collect all parent node IDs for default expand
  const allParentIds = useMemo(() => {
    const ids: string[] = [];
    function collect(nodes: TocTreeNode[]) {
      for (const node of nodes) {
        if (node.children.length > 0) {
          ids.push(node.id);
          collect(node.children);
        }
      }
    }
    collect(tocTree);
    return ids;
  }, [tocTree]);

  const [activeId, setActiveId] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(allParentIds));
  const containerRef = useRef<HTMLElement>(null);

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

  const toggleExpand = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Auto-expand the ancestor chain of the active item
  useEffect(() => {
    if (!activeId) return;

    // Find all ancestors of the active item
    const ancestors: string[] = [];
    function findAncestors(nodes: TocTreeNode[], path: string[]): boolean {
      for (const node of nodes) {
        if (node.id === activeId) {
          ancestors.push(...path);
          return true;
        }
        if (findAncestors(node.children, [...path, node.id])) {
          return true;
        }
      }
      return false;
    }
    findAncestors(tocTree, []);

    if (ancestors.length > 0) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        ancestors.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [activeId, tocTree]);

  // Auto-scroll the TOC container to keep active item visible
  useEffect(() => {
    if (!containerRef.current || !activeId) return;
    const activeEl = containerRef.current.querySelector(`[data-toc-active="true"]`) as HTMLElement | null;
    if (!activeEl) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const activeRect = activeEl.getBoundingClientRect();

    if (activeRect.bottom > containerRect.bottom - 20) {
      activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } else if (activeRect.top < containerRect.top + 20) {
      activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [activeId]);

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
    <nav
      ref={containerRef}
      className="sticky top-[120px] max-h-[calc(100vh-160px)] overflow-y-auto pl-6 border-l border-outline-variant"
    >
      {/* Title */}
      <h4 className="font-display text-[13px] font-semibold text-primary mb-5 uppercase tracking-[0.12em] flex items-center gap-2">
        <svg className="w-3.5 h-3.5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h8" />
        </svg>
        目录
      </h4>

      {/* TOC items */}
      <TocNodeList
        nodes={tocTree}
        activeId={activeId}
        expandedIds={expandedIds}
        onItemClick={handleClick}
        onToggleExpand={toggleExpand}
      />
    </nav>
  );
}

/** Map heading level → left padding (Tailwind classes) */
const LEVEL_INDENT: Record<number, string> = {
  1: 'pl-3',
  2: 'pl-6',
  3: 'pl-10',
  4: 'pl-14',
  5: 'pl-[68px]',
  6: 'pl-[80px]',
};

/** Map heading level → font styles */
const LEVEL_FONT: Record<number, string> = {
  1: 'text-[14px] leading-[22px] font-semibold',
  2: 'text-[13px] leading-[20px] font-medium',
  3: 'text-[12.5px] leading-[19px]',
  4: 'text-[12px] leading-[18px]',
  5: 'text-[11.5px] leading-[17px]',
  6: 'text-[11px] leading-[16px]',
};

/** Map heading level → color when not active */
const LEVEL_COLOR: Record<number, string> = {
  1: 'text-on-surface-variant hover:text-primary',
  2: 'text-on-surface-variant hover:text-primary',
  3: 'text-on-surface-variant hover:text-primary',
  4: 'text-on-surface-variant/80 hover:text-primary',
  5: 'text-on-surface-variant/65 hover:text-primary',
  6: 'text-on-surface-variant/50 hover:text-primary',
};

/** Recursively render TOC nodes */
function TocNodeList({
  nodes,
  activeId,
  expandedIds,
  onItemClick,
  onToggleExpand,
  depth = 0,
}: {
  nodes: TocTreeNode[];
  activeId: string;
  expandedIds: Set<string>;
  onItemClick: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  depth?: number;
}) {
  return (
    <ul className={depth > 0 ? 'overflow-hidden' : 'space-y-0.5'}>
      {nodes.map((node) => {
        const isActive = activeId === node.id;
        const hasChildren = node.children.length > 0;
        const isExpanded = expandedIds.has(node.id);
        const isAncestorOfActive = hasChildren && !isActive && isDescendantActive(node.children, activeId);
        const indent = LEVEL_INDENT[node.level] || 'pl-3';
        const font = LEVEL_FONT[node.level] || 'text-[13px] leading-[20px]';
        const color = LEVEL_COLOR[node.level] || 'text-on-surface-variant hover:text-primary';

        return (
          <li key={node.id}>
            {/* Item row: accent bar + expand chevron + label */}
            <div className="relative flex items-center group">
              {/* Active indicator bar — slides on the left edge */}
              <span
                className={`absolute -left-[17px] top-1/2 -translate-y-1/2 w-[3px] rounded-full transition-all duration-300 ease-out ${
                  isActive
                    ? 'h-[18px] bg-secondary'
                    : isAncestorOfActive
                      ? 'h-[12px] bg-secondary/30'
                      : 'h-0 bg-transparent group-hover:h-[8px] group-hover:bg-outline-variant/50'
                }`}
              />

              <a
                data-toc-active={isActive ? 'true' : undefined}
                href={`#${node.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  onItemClick(node.id);
                }}
                className={`block flex-1 py-1 pr-1 text-left transition-all duration-200 rounded-sm ${indent} ${font} ${
                  isActive
                    ? 'text-secondary font-semibold'
                    : color
                }`}
              >
                {node.text}
              </a>

              {/* Expand/collapse chevron for items with children */}
              {hasChildren && (
                <button
                  onClick={(e) => onToggleExpand(node.id, e)}
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-on-surface-variant/40 hover:text-primary hover:bg-surface-container-low transition-all duration-200"
                  aria-label={isExpanded ? '收起' : '展开'}
                >
                  <svg
                    className={`w-3 h-3 transition-transform duration-250 ease-out ${isExpanded ? 'rotate-90' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              )}
            </div>

            {/* Children — collapsible with height animation */}
            {hasChildren && (
              <div
                className={`grid transition-all duration-300 ease-out ${
                  isExpanded || isAncestorOfActive
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <TocNodeList
                    nodes={node.children}
                    activeId={activeId}
                    expandedIds={expandedIds}
                    onItemClick={onItemClick}
                    onToggleExpand={onToggleExpand}
                    depth={depth + 1}
                  />
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Check if any descendant of nodes has the activeId */
function isDescendantActive(nodes: TocTreeNode[], activeId: string): boolean {
  for (const node of nodes) {
    if (node.id === activeId) return true;
    if (isDescendantActive(node.children, activeId)) return true;
  }
  return false;
}
