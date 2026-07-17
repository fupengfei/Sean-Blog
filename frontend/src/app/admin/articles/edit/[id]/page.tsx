'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  adminGetArticleById,
  adminGetArticleRelations,
  adminGetArticles,
  adminSetPrerequisite,
  adminRemovePrerequisite,
  adminSetRelated,
} from '@/lib/api';
import type { Article, ArticleRelations } from '@/types';

// ---------------------------------------------------------------------------
// Article search dropdown hook
// ---------------------------------------------------------------------------

function useArticleSearch() {
  const [results, setResults] = useState<{ id: number; title: string }[]>([]);
  const [searching, setSearching] = useState(false);

  const search = useCallback(async (keyword: string) => {
    if (!keyword.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await adminGetArticles({ page: 1, size: 20, keyword });
      setResults(res.list.map((a) => ({ id: a.id, title: a.title })));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  return { results, searching, search };
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminArticleEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Relations
  const [prerequisiteId, setPrerequisiteId] = useState<number | null>(null);
  const [prerequisiteTitle, setPrerequisiteTitle] = useState('');
  const [relatedIds, setRelatedIds] = useState<number[]>([]);
  const [relatedTitles, setRelatedTitles] = useState<Map<number, string>>(
    new Map(),
  );

  // Search dropdowns
  const prereqSearch = useArticleSearch();
  const relatedSearch = useArticleSearch();

  // Dropdown open states
  const [prereqOpen, setPrereqOpen] = useState(false);
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [prereqQuery, setPrereqQuery] = useState('');
  const [relatedQuery, setRelatedQuery] = useState('');

  // Save states
  const [savingPrereq, setSavingPrereq] = useState(false);
  const [savingRelated, setSavingRelated] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Pre-filtered dropdown results
  const prereqFiltered = prereqSearch.results.filter((a) => a.id !== id);
  const relatedFiltered = relatedSearch.results.filter(
    (a) => a.id !== id && !relatedIds.includes(a.id),
  );

  // ------------------------------------------------------------------
  // Fetch article + relations on mount
  // ------------------------------------------------------------------

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setError('');

    Promise.all([
      adminGetArticleById(id),
      adminGetArticleRelations(id),
    ])
      .then(([art, rels]) => {
        setArticle(art);
        // Prerequisite
        if (rels.prerequisite) {
          setPrerequisiteId(rels.prerequisite.id);
          setPrerequisiteTitle(rels.prerequisite.title);
        }
        // Related
        const ids = rels.related.map((r) => r.id);
        setRelatedIds(ids);
        const titles = new Map<number, string>();
        rels.related.forEach((r) => titles.set(r.id, r.title));
        setRelatedTitles(titles);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : '加载失败');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // ------------------------------------------------------------------
  // Handlers
  // ------------------------------------------------------------------

  const handleSavePrerequisite = async () => {
    setSavingPrereq(true);
    setSaveMsg('');
    try {
      if (prerequisiteId) {
        await adminSetPrerequisite(id, prerequisiteId);
      } else {
        await adminRemovePrerequisite(id);
      }
      setSaveMsg('前置文章已保存');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingPrereq(false);
    }
  };

  const handleSaveRelated = async () => {
    setSavingRelated(true);
    setSaveMsg('');
    try {
      await adminSetRelated(id, relatedIds);
      setSaveMsg('相关文章已保存');
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingRelated(false);
    }
  };

  // Handle clicking outside dropdown
  useEffect(() => {
    const handler = () => {
      setPrereqOpen(false);
      setRelatedOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // ------------------------------------------------------------------
  // States: loading / error
  // ------------------------------------------------------------------

  if (loading) {
    return (
      <div className="text-on-surface-variant text-sm py-8 text-center">
        加载中...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 text-sm">{error || '文章不存在'}</p>
        <Link
          href="/admin/articles"
          className="text-secondary text-sm mt-4 inline-block hover:underline"
        >
          返回文章列表
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="mb-6 text-sm text-on-surface-variant">
        <Link
          href="/admin/articles"
          className="hover:text-primary transition-colors"
        >
          文章管理
        </Link>
        <span className="mx-2">/</span>
        <span className="text-on-surface">编辑关联</span>
      </div>

      <h1 className="text-2xl font-display font-semibold text-on-surface mb-8">
        编辑文章关联
      </h1>

      {/* Article info card */}
      <div className="mb-8 p-5 rounded-xl border border-outline-variant bg-surface-container-low">
        <p className="font-display text-[15px] font-semibold text-primary mb-2">
          {article.title}
        </p>
        <div className="flex items-center gap-3 text-[13px] text-on-surface-variant">
          <span>{article.author || 'Sean'}</span>
          <span>·</span>
          <span>{article.status}</span>
          <span>·</span>
          <span>{article.category?.name || '未分类'}</span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Prerequisite                                                   */}
      {/* ------------------------------------------------------------------ */}

      <section className="mb-10 p-6 rounded-xl border border-outline-variant">
        <h2 className="font-display text-[16px] font-semibold text-primary mb-4">
          前置文章
        </h2>
        <p className="text-[13px] text-on-surface-variant mb-4">
          设置后，文章详情页顶部将提示读者先阅读前置文章。留空则不显示。
        </p>

        {/* Current / selected */}
        {prerequisiteId && prerequisiteTitle ? (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm text-primary font-medium">
              📖 {prerequisiteTitle}
            </span>
            <button
              onClick={() => {
                setPrerequisiteId(null);
                setPrerequisiteTitle('');
                setPrereqQuery('');
              }}
              className="text-xs text-red-500 hover:text-red-600 ml-2"
            >
              清除
            </button>
          </div>
        ) : (
          <p className="text-[13px] text-on-surface-variant/60 mb-3">
            未设置前置文章
          </p>
        )}

        {/* Search dropdown */}
        {!prerequisiteId && (
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <input
              type="text"
              value={prereqQuery}
              onChange={(e) => {
                setPrereqQuery(e.target.value);
                prereqSearch.search(e.target.value);
                setPrereqOpen(true);
              }}
              onFocus={() => setPrereqOpen(true)}
              placeholder="搜索文章..."
              className="w-full border border-outline-variant rounded px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
            {prereqOpen &&
              (prereqSearch.results.length > 0 || prereqSearch.searching) && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {prereqSearch.searching ? (
                    <p className="px-4 py-2 text-sm text-on-surface-variant/60">
                      搜索中...
                    </p>
                  ) : (
                    prereqFiltered.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setPrerequisiteId(a.id);
                          setPrerequisiteTitle(a.title);
                          setPrereqQuery('');
                          setPrereqOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        {a.title}
                      </button>
                    )))}
                </div>
              )}
          </div>
        )}

        {/* Save button */}
        <button
          onClick={handleSavePrerequisite}
          disabled={savingPrereq}
          className="mt-4 px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {savingPrereq ? '保存中...' : '保存前置文章'}
        </button>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Related Articles                                               */}
      {/* ------------------------------------------------------------------ */}

      <section className="mb-10 p-6 rounded-xl border border-outline-variant">
        <h2 className="font-display text-[16px] font-semibold text-primary mb-4">
          相关文章
        </h2>
        <p className="text-[13px] text-on-surface-variant mb-4">
          关联文章会显示在文章详情页底部的「相关文章」区域。关系是双向的。
        </p>

        {/* Current related */}
        {relatedIds.length > 0 ? (
          <div className="space-y-2 mb-4">
            {relatedIds.map((rid) => (
              <div
                key={rid}
                className="flex items-center justify-between px-3 py-2 rounded border border-outline-variant bg-surface-container-low"
              >
                <span className="text-sm text-primary">
                  {relatedTitles.get(rid) || `文章 #${rid}`}
                </span>
                <button
                  onClick={() => {
                    setRelatedIds((prev) => prev.filter((x) => x !== rid));
                    setRelatedTitles((prev) => {
                      const next = new Map(prev);
                      next.delete(rid);
                      return next;
                    });
                  }}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-on-surface-variant/60 mb-3">
            未设置相关文章
          </p>
        )}

        {/* Search + add */}
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={relatedQuery}
            onChange={(e) => {
              setRelatedQuery(e.target.value);
              relatedSearch.search(e.target.value);
              setRelatedOpen(true);
            }}
            onFocus={() => setRelatedOpen(true)}
            placeholder="搜索文章并添加..."
            className="w-full border border-outline-variant rounded px-4 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
          {relatedOpen &&
            (relatedSearch.results.length > 0 || relatedSearch.searching) && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-outline-variant rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {relatedSearch.searching ? (
                  <p className="px-4 py-2 text-sm text-on-surface-variant/60">
                    搜索中...
                  </p>
                ) : (
                    relatedFiltered.map((a) => (
                      <button
                        key={a.id}
                        onClick={() => {
                          setRelatedIds((prev) => [...prev, a.id]);
                          setRelatedTitles((prev) => {
                            const next = new Map(prev);
                            next.set(a.id, a.title);
                            return next;
                          });
                          setRelatedQuery('');
                          setRelatedOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-on-surface hover:bg-surface-container transition-colors"
                      >
                        {a.title}
                      </button>
                    )))}
              </div>
            )}
        </div>

        {/* Save button */}
        <button
          onClick={handleSaveRelated}
          disabled={savingRelated}
          className="mt-4 px-5 py-2 rounded bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {savingRelated ? '保存中...' : '保存相关文章'}
        </button>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Save message                                                   */}
      {/* ------------------------------------------------------------------ */}

      {saveMsg && (
        <div
          className={`text-sm px-4 py-3 rounded mb-6 ${
            saveMsg.includes('失败')
              ? 'text-red-600 bg-red-50 border border-red-200'
              : 'text-green-700 bg-green-50 border border-green-200'
          }`}
        >
          {saveMsg}
        </div>
      )}
    </div>
  );
}
