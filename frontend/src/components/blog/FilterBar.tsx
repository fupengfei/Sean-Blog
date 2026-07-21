'use client';

import { useEffect, useState } from 'react';
import { getCategories } from '@/lib/api';
import type { Category } from '@/types';

interface FilterBarProps {
  selectedCategory: string | null;
  onCategoryChange: (id: string | null) => void;
}

export default function FilterBar({ selectedCategory, onCategoryChange }: FilterBarProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 animate-pulse">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 rounded bg-surface-container" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        onClick={() => onCategoryChange(null)}
        className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
          selectedCategory === null
            ? 'bg-primary text-white'
            : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onCategoryChange(cat.id)}
          className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
            selectedCategory === cat.id
              ? 'bg-primary text-white'
              : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
