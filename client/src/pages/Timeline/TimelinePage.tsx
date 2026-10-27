import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

import { useBlog } from '@client/src/blog-context';
import { articleCategory, categoryLabel } from '@client/src/lib/categories';
import type { ArticleSummary } from '@shared/api.interface';

const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

interface DayGroup {
  key: string;
  label: string; // 9月1日
  weekday: string;
  items: ArticleSummary[];
}

// 按日期倒序分组（接口本身按 createdAt 倒序返回，这里只做分组）
function groupByDay(articles: ArticleSummary[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const a of articles) {
    const d = dayjs(a.createdAt);
    const key = d.format('YYYY-MM-DD');
    let g = groups.get(key);
    if (!g) {
      g = {
        key,
        label: d.format('M月D日'),
        weekday: WEEKDAYS[d.day()],
        items: [],
      };
      groups.set(key, g);
    }
    g.items.push(a);
  }
  return Array.from(groups.values());
}

// 单条动态：左侧时间 + 时间轴节点，右侧文章卡片
function TimelineItem({ article, isLast }: { article: ArticleSummary; isLast: boolean }) {
  return (
    <div className="relative flex gap-3 md:gap-5">
      <time className="w-11 shrink-0 pt-5 text-right text-xs tabular-nums text-muted-foreground md:w-14 md:text-[13px]">
        {dayjs(article.createdAt).format('HH:mm')}
      </time>
      {/* 时间轴竖线与节点 */}
      <div className="relative w-2.5 shrink-0 self-stretch">
        <span
          className={`absolute left-1/2 top-6 bottom-0 w-px -translate-x-1/2 bg-border ${
            isLast ? 'hidden' : ''
          }`}
        />
        <span className="absolute left-1/2 top-[1.65rem] z-10 h-2 w-2 -translate-x-1/2 rounded-full bg-primary/80 ring-4 ring-background" />
      </div>
      <Link
        to={`/post/${encodeURIComponent(article.slug)}`}
        className="group mb-4 flex-1 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-foreground/25 hover:shadow-sm md:p-5"
      >
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary md:text-base">
          {article.title}
        </h3>
        {article.summary && (
          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground md:text-sm">
            {article.summary}
          </p>
        )}
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
            {categoryLabel(articleCategory(article))}
          </span>
        </div>
      </Link>
    </div>
  );
}

export default function TimelinePage() {
  const { articles, loading, error } = useBlog();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    document.title = '动态轴 · My Blog';
  }, []);

  const groups = useMemo(() => groupByDay(articles), [articles]);

  const toggle = (key: string) =>
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="mx-auto w-full max-w-3xl px-6">
      {/* 刊头 */}
      <div className="pb-8 pt-12 md:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Timeline</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">动态轴</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          按时间倒序浏览发布的每一篇文章
          {!loading && !error && articles.length > 0 ? ` · 共 ${articles.length} 篇` : ''}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : error ? (
        <p className="py-20 text-sm text-destructive">加载失败：{error}</p>
      ) : groups.length === 0 ? (
        <p className="py-20 text-sm text-muted-foreground">还没有发布任何文章</p>
      ) : (
        <div className="pb-4">
          {groups.map((g) => {
            const isCollapsed = collapsed[g.key] ?? false;
            return (
              <section key={g.key}>
                {/* 日期分组头：可折叠 */}
                <button
                  type="button"
                  onClick={() => toggle(g.key)}
                  className="group flex items-center gap-2 py-3 text-left"
                >
                  <span className="text-lg font-bold tracking-tight md:text-xl">{g.label}</span>
                  {isCollapsed ? (
                    <ChevronRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                  )}
                  <span className="ml-1 text-[13px] text-muted-foreground">
                    {g.weekday} · {g.items.length} 条
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="pl-1 md:pl-2">
                    {g.items.map((a, i) => (
                      <TimelineItem
                        key={a.id}
                        article={a}
                        isLast={i === g.items.length - 1}
                      />
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
