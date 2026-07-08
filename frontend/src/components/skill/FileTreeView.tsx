'use client';

import { useState } from 'react';
import type { FileTreeNode } from '@/types';

interface FileTreeViewProps {
  tree: FileTreeNode[];
  onSelectFile: (path: string) => void;
}

interface TreeNodeItemProps {
  node: FileTreeNode;
  onSelectFile: (path: string) => void;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  depth?: number;
}

function TreeNodeItem({ node, onSelectFile, expanded, onToggle, depth = 0 }: TreeNodeItemProps) {
  const isDirectory = node.nodeType === 'DIRECTORY';
  const isExpanded = expanded.has(node.filePath);

  const handleClick = () => {
    if (isDirectory) {
      onToggle(node.filePath);
    } else {
      onSelectFile(node.filePath);
    }
  };

  return (
    <div>
      {/* Node row */}
      <button
        onClick={handleClick}
        className="flex items-center gap-2 w-full text-left py-1.5 px-2 rounded hover:bg-surface-container transition-colors group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse arrow for directories */}
        {isDirectory ? (
          <svg
            className={`w-4 h-4 text-on-surface-variant flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <span className="w-4 flex-shrink-0" />
        )}

        {/* Icon */}
        {isDirectory ? (
          <svg
            className={`w-5 h-5 flex-shrink-0 ${
              isExpanded ? 'text-primary' : 'text-on-surface-variant'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
            />
          </svg>
        ) : (
          <svg
            className="w-5 h-5 text-on-surface-variant flex-shrink-0"
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
        )}

        {/* Name */}
        <span
          className={`text-sm truncate ${
            isDirectory ? 'font-medium text-on-surface' : 'text-on-surface-variant'
          }`}
        >
          {node.name}
        </span>

        {/* File size */}
        {!isDirectory && node.fileSize != null && (
          <span className="text-xs text-on-surface-variant/50 ml-auto flex-shrink-0 pl-2">
            {formatFileSize(node.fileSize)}
          </span>
        )}
      </button>

      {/* Children (only for expanded directories) */}
      {isDirectory && isExpanded && node.children && node.children.length > 0 && (
        <div>
          {node.children.map((child) => (
            <TreeNodeItem
              key={child.filePath}
              node={child}
              onSelectFile={onSelectFile}
              expanded={expanded}
              onToggle={onToggle}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Empty directory */}
      {isDirectory && isExpanded && (!node.children || node.children.length === 0) && (
        <p
          className="text-xs text-on-surface-variant/50 py-1"
          style={{ paddingLeft: `${(depth + 1) * 16 + 32}px` }}
        >
          空目录
        </p>
      )}
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileTreeView({ tree, onSelectFile }: FileTreeViewProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const handleToggle = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  if (!tree || tree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
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
            d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12A2.25 2.25 0 004.5 20.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
          />
        </svg>
        <p className="text-sm text-on-surface-variant/50">暂无文件</p>
      </div>
    );
  }

  return (
    <div className="py-2">
      {tree.map((node) => (
        <TreeNodeItem
          key={node.filePath}
          node={node}
          onSelectFile={onSelectFile}
          expanded={expanded}
          onToggle={handleToggle}
        />
      ))}
    </div>
  );
}
