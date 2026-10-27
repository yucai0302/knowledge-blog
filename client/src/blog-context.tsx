import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { fetchArticles } from '@client/src/api';
import type { ArticleSummary } from '@shared/api.interface';

interface BlogContextValue {
  articles: ArticleSummary[];
  loading: boolean;
  error: string | null;
  keyword: string;
  setKeyword: (kw: string) => void;
}

const BlogContext = createContext<BlogContextValue | null>(null);

export function BlogProvider({ children }: { children: ReactNode }) {
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchArticles()
      .then((res) => {
        if (!cancelled) setArticles(res.items);
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message ?? '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({ articles, loading, error, keyword, setKeyword }),
    [articles, loading, error, keyword],
  );

  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>;
}

export function useBlog(): BlogContextValue {
  const ctx = useContext(BlogContext);
  if (!ctx) throw new Error('useBlog must be used within BlogProvider');
  return ctx;
}
