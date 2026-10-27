import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

import { useBlog } from '@client/src/blog-context';
import { CATEGORIES, articleCategory, categoryLabel } from '@client/src/lib/categories';

export default function HomePage() {
  const { articles, loading, error, keyword, setKeyword } = useBlog();
  const [cat, setCat] = useState('all');

  useEffect(() => {
    document.title = 'My Blog';
  }, []);

  const catTabs = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of articles) {
      const k = articleCategory(a);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const tabs = [{ key: 'all', label: '全部', count: articles.length }];
    for (const c of CATEGORIES) {
      const n = counts.get(c.key) ?? 0;
      if (n > 0) tabs.push({ key: c.key, label: c.label, count: n });
    }
    const other = counts.get('other') ?? 0;
    if (other > 0) tabs.push({ key: 'other', label: '其他', count: other });
    return tabs;
  }, [articles]);

  const filtered = useMemo(() => {
    let list =
      cat === 'all' ? articles : articles.filter((a) => articleCategory(a) === cat);
    const kw = keyword.trim().toLowerCase();
    if (kw) {
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(kw) ||
          (a.summary ?? '').toLowerCase().includes(kw),
      );
    }
    return list;
  }, [articles, keyword, cat]);

  const searching = keyword.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6">
      {/* 刊头 */}
      <div className="pb-10 pt-12 md:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Blog</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">My Blog</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          记录 AI 工程、Agent 与论文的学习笔记
          {!loading && !error && articles.length > 0 ? ` · 共 ${articles.length} 篇` : ''}
        </p>
      </div>

      {/* 分类筛选 */}
      {!loading && !error && catTabs.length > 1 && (
        <div className="flex flex-wrap gap-2 pb-8">
          {catTabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setCat(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${
                cat === t.key
                  ? 'bg-foreground font-medium text-background'
                  : 'border border-border text-muted-foreground hover:border-foreground/35 hover:text-foreground'
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-[11px] tabular-nums opacity-60">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* 搜索状态 */}
      {searching && (
        <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
          <p className="text-sm text-muted-foreground">
            “{keyword.trim()}” · {filtered.length} 条结果
          </p>
          <button
            onClick={() => setKeyword('')}
            className="text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            清除
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : error ? (
        <p className="py-20 text-sm text-destructive">加载失败：{error}</p>
      ) : filtered.length === 0 ? (
        <p className="py-20 text-sm text-muted-foreground">
          {articles.length === 0 ? '还没有发布任何文章' : '没有匹配的文章'}
        </p>
      ) : (
        <ul className="divide-y divide-border border-t border-border">
          {filtered.map((a) => (
            <li key={a.id}>
              <Link to={`/post/${encodeURIComponent(a.slug)}`} className="group block py-6">
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                  {categoryLabel(articleCategory(a))}
                </p>
                <div className="mt-1.5 flex items-baseline justify-between gap-6">
                  <h2 className="text-lg font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
                    {a.title}
                  </h2>
                  <time className="shrink-0 text-[13px] tabular-nums text-muted-foreground">
                    {dayjs(a.createdAt).format('YYYY-MM-DD')}
                  </time>
                </div>
                {a.summary && (
                  <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                    {a.summary}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
