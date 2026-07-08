'use client';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    const pages: (number | 'ellipsis')[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (page > 3) {
        pages.push('ellipsis');
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (page < totalPages - 2) {
        pages.push('ellipsis');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <nav className="flex items-center justify-center gap-1 mt-12" aria-label="分页导航">
      {/* First page */}
      <button
        onClick={() => onPageChange(1)}
        disabled={page === 1}
        className="px-3 py-2 rounded text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="首页"
      >
        首页
      </button>

      {/* Previous page */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        className="px-3 py-2 rounded text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="上一页"
      >
        上一页
      </button>

      {/* Page numbers */}
      {getPageNumbers().map((item, idx) => {
        if (item === 'ellipsis') {
          return (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 py-2 text-sm text-on-surface-variant/50"
            >
              ...
            </span>
          );
        }

        return (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={`w-9 h-9 rounded text-sm font-medium transition-colors ${
              item === page
                ? 'bg-primary text-white'
                : 'text-on-surface-variant hover:bg-surface-container'
            }`}
            aria-label={`第 ${item} 页`}
            aria-current={item === page ? 'page' : undefined}
          >
            {item}
          </button>
        );
      })}

      {/* Next page */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="下一页"
      >
        下一页
      </button>

      {/* Last page */}
      <button
        onClick={() => onPageChange(totalPages)}
        disabled={page === totalPages}
        className="px-3 py-2 rounded text-sm text-on-surface-variant hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="末页"
      >
        末页
      </button>
    </nav>
  );
}
