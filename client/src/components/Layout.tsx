import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Search } from 'lucide-react';

import { useBlog } from '@client/src/blog-context';
import { LcLogo } from '@client/src/components/lc-logo';
import { LikeButton } from '@client/src/components/LikeButton';

const SITE_NAME = 'My Blog';

function Topbar() {
  const { articles, loading } = useBlog();
  const { keyword, setKeyword } = useBlog();
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="sticky top-0 z-20 shrink-0 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-3 px-6 md:gap-6">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <LcLogo className="h-[26px] w-[26px]" />
          <span className="text-[16px] font-semibold tracking-tight">{SITE_NAME}</span>
        </Link>

        <LikeButton />

        <nav className="ml-auto hidden items-center sm:flex">
          <Link
            to="/timeline"
            className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              pathname === '/timeline'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            动态轴
          </Link>
          <Link
            to="/"
            className={`ml-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              pathname === '/'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            文章
            {!loading && articles.length > 0 && (
              <span className="ml-1.5 text-xs tabular-nums opacity-60">{articles.length}</span>
            )}
          </Link>
          <Link
            to="/projects"
            className={`ml-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              pathname === '/projects'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Github
          </Link>
          <Link
            to="/about"
            className={`ml-1.5 rounded-full px-3.5 py-1.5 text-sm transition-colors ${
              pathname === '/about'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            关于
          </Link>
        </nav>

        <div className="relative w-full min-w-0 max-w-[220px] flex-1 sm:max-w-[240px] sm:flex-none sm:shrink-0">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (pathname !== '/' && e.target.value) navigate('/');
            }}
            placeholder="搜索"
            className="h-9 w-full rounded-full border border-border bg-card pl-8.5 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/70 hover:border-foreground/25 focus:border-foreground/40 focus:ring-2 focus:ring-foreground/10"
          />
          <kbd className="absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center text-[10px] font-medium leading-none text-muted-foreground/60 md:inline-flex">
            Ctrl K
          </kbd>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-16 shrink-0 border-t border-border/70">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 px-6 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} {SITE_NAME}</p>
        <p className="text-muted-foreground/70">保持好奇 · 持续学习</p>
      </div>
    </footer>
  );
}

const Layout = () => {
  useEffect(() => {
    // 宿主平台会在加载后把 title 改写为应用名，这里延迟重设；
    // 文章页标题含站点名后缀，视为已接管，不覆盖
    const apply = () => {
      if (!document.title.includes(SITE_NAME)) document.title = SITE_NAME;
    };
    apply();
    const t1 = setTimeout(apply, 800);
    const t2 = setTimeout(apply, 2000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="flex min-h-screen min-w-0 flex-col bg-background text-foreground antialiased">
      <Topbar />
      <main className="flex flex-1 flex-col">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
