import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { fetchArticleBySlug } from '@client/src/api';
import { articleCategory, categoryLabel } from '@client/src/lib/categories';
import { Streamdown } from '@client/src/components/ui/streamdown';
import { cn } from '@client/src/lib/utils';
import type { ArticleDetail } from '@shared/api.interface';

interface TocItem {
  level: number;
  text: string;
}

// 返回上一页（从动态轴/文章列表进入均可回退；无历史记录时兜底回文章列表）
function BackLink() {
  const navigate = useNavigate();
  const goBack = () => {
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };
  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      返回上一页
    </button>
  );
}

// 沙箱 iframe（无 allow-same-origin）两大限制的兼容注入：
// 1) localStorage/sessionStorage 访问抛 SecurityError，文章自带脚本会中断 → 内存版垫片兜底
// 2) 点击 <a href="#anchor"> 锚点链接无效（Chromium 限制 opaque origin 文档的 fragment 导航）
//    → 拦截点击，改用 scrollIntoView 平滑滚动
function withIframeCompat(html: string): string {
  const shim = `<script>(function(){
function mk(){var m={};return{getItem:function(k){return Object.prototype.hasOwnProperty.call(m,k)?m[k]:null},setItem:function(k,v){m[k]=String(v)},removeItem:function(k){delete m[k]},clear:function(){m={}},key:function(i){var ks=Object.keys(m);return i<ks.length?ks[i]:null},get length(){return Object.keys(m).length}}}
function patch(n){var ok=false;try{window[n].getItem('__probe__');ok=true}catch(e){}if(!ok){try{Object.defineProperty(window,n,{value:mk(),configurable:true})}catch(e){}}}
patch('localStorage');patch('sessionStorage');
function findEl(id){var t=null;try{t=document.getElementById(id)||document.getElementById(decodeURIComponent(id))}catch(e){t=document.getElementById(id)}
if(!t){try{t=document.getElementsByName(id)[0]||null}catch(e){}}
return t}
// 捕获阶段拦截，先于文章自身脚本；同时兜底 <a name> 锚点与相对路径哈希
window.addEventListener('click',function(e){
  var el=e.target;
  while(el&&el.nodeType===1&&el.tagName!=='A')el=el.parentNode;
  if(!el||el.nodeType!==1)return;
  var href=el.getAttribute('href')||'';
  var p=href.indexOf('#');
  if(p<0)return;
  var pre=href.slice(0,p);
  if(pre&&pre!=='.'&&pre!=='./'){
    if(/^(mailto|javascript|tel):/i.test(pre))return;
    if(/^https?:/i.test(pre)){try{var u=new URL(href,location.href);e.preventDefault();window.open(u.href,'_blank','noopener')}catch(x){e.preventDefault()}return}
  }
  e.preventDefault();
  var f=href.slice(p+1);
  if(f===''){window.scrollTo({top:0,behavior:'smooth'});return}
  var t=findEl(f);
  if(t){try{t.scrollIntoView({behavior:'smooth',block:'start'})}catch(err){t.scrollIntoView(true)}}
},true);
})();</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head[^>]*>/i, (m) => m + shim);
  return shim + html;
}

function extractToc(content: string): TocItem[] {
  const items: TocItem[] = [];
  let inCode = false;
  for (const line of content.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = /^(#{1,3})\s+(.+?)\s*#*\s*$/.exec(line);
    if (m) {
      items.push({ level: m[1].length, text: m[2].replace(/[`*]/g, '').trim() });
    }
  }
  return items;
}

function Toc({
  items,
  activeIndex,
  onJump,
}: {
  items: TocItem[];
  activeIndex: number;
  onJump: (index: number) => void;
}) {
  if (items.length === 0) return null;
  return (
    <aside className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-52 shrink-0 overflow-y-auto pb-8 xl:block">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className="h-1 w-1 rounded-full bg-primary" />
        目录
      </p>
      <ul className="space-y-0.5 text-[13px] leading-snug">
        {items.map((it, i) => (
          <li key={i}>
            <button
              type="button"
              onClick={() => onJump(i)}
              className={cn(
                'block w-full border-l-2 py-1 text-left transition-colors',
                it.level === 2 ? 'pl-3.5' : it.level === 3 ? 'pl-6' : 'pl-2',
                i === activeIndex
                  ? 'border-primary font-medium text-primary'
                  : 'border-border/60 text-muted-foreground hover:text-foreground',
              )}
            >
              <span className="line-clamp-2">{it.text}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}

export default function PostPage() {
  const { slug = '' } = useParams();
  const [article, setArticle] = useState<ArticleDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setArticle(null);
    fetchArticleBySlug(slug)
      .then((res) => {
        if (!cancelled) {
          setArticle(res);
          document.title = `${res.title} · My Blog`;
          window.scrollTo(0, 0);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e?.response?.data?.error?.message ?? e?.message ?? '加载失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const toc = useMemo(
    () => (article && article.type === 'markdown' ? extractToc(article.content) : []),
    [article],
  );

  // HTML 文章用 blob URL 渲染，组件卸载或文章切换时释放
  const blobUrl = useMemo(() => {
    if (!article || article.type !== 'html') return '';
    return URL.createObjectURL(new Blob([withIframeCompat(article.content)], { type: 'text/html' }));
  }, [article]);

  useEffect(() => {
    if (!blobUrl) return;
    return () => URL.revokeObjectURL(blobUrl);
  }, [blobUrl]);

  // 实时获取正文标题元素。Streamdown 渲染完成时机不确定（内部分块/异步高亮），
  // 不能依赖挂载后一次性注入 id——点击与高亮均按 index 实时查询，保证目录随时可用
  const getHeadings = useCallback((): HTMLElement[] => {
    const root = contentRef.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>('h1, h2, h3'));
  }, []);

  const jumpToHeading = useCallback(
    (index: number) => {
      const el = getHeadings()[index];
      if (!el) return;
      el.style.scrollMarginTop = '4.5rem';
      const before = el.getBoundingClientRect().top;
      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        el.scrollIntoView(true);
      }
      // 个别环境禁用平滑滚动时 scrollIntoView 会静默无效，350ms 后位置未变则直接跳转
      window.setTimeout(() => {
        const top = el.getBoundingClientRect().top;
        if (Math.abs(top - before) < 2) {
          window.scrollTo(0, Math.max(0, window.scrollY + top - 72));
        }
      }, 350);
    },
    [getHeadings],
  );

  // 滚动时高亮当前小节
  useEffect(() => {
    if (toc.length === 0) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const heads = getHeadings();
        if (heads.length === 0) return;
        let current = 0;
        heads.forEach((h, i) => {
          if (h.getBoundingClientRect().top <= 96) current = i;
        });
        setActiveIndex(current);
      });
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', onScroll);
    };
  }, [article, toc.length, getHeadings]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-8 py-24 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载中…
      </div>
    );
  }

  if (error || !article) {
    return <p className="px-8 py-24 text-sm text-destructive">加载失败：{error ?? '文章不存在'}</p>;
  }

  if (article.type === 'html') {
    // HTML 文档：完整自包含（含自有样式与脚本），宽幅沙箱 iframe 原样呈现。
    // 用 blob URL 而非 srcdoc——个别 Chromium 套壳浏览器/WebView 对沙箱 srcdoc 存在渲染空白的兼容问题
    return (
      <div className="mx-auto w-full max-w-5xl px-6 py-8">
        <BackLink />
        <div className="mb-5 flex items-baseline justify-between gap-4">
          <h1 className="truncate text-lg font-semibold tracking-tight">{article.title}</h1>
          <div className="flex shrink-0 items-baseline gap-3">
            <a
              href={blobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              新窗口打开
            </a>
            <time className="text-[13px] tabular-nums text-muted-foreground">
              {dayjs(article.createdAt).format('YYYY年M月D日')}
            </time>
          </div>
        </div>
        <iframe
          title={article.title}
          src={blobUrl}
          sandbox="allow-scripts allow-popups"
          className="w-full rounded-xl border border-border bg-card shadow-xs"
          style={{ height: 'calc(100vh - 12rem)' }}
        />
      </div>
    );
  }

  return (
    <div className="flex gap-8 px-6 py-12 md:px-10 md:py-16">
      <article className="mx-auto w-full min-w-0 max-w-3xl">
        <BackLink />
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-primary">
            {categoryLabel(articleCategory(article))}
          </p>
          <h1 className="mt-3 text-[30px] font-bold leading-[1.2] tracking-tight md:text-4xl">
            {article.title}
          </h1>
          <p className="mt-4 text-[13px] tabular-nums text-muted-foreground">
            {dayjs(article.createdAt).format('YYYY年M月D日')}
          </p>
          {article.summary && (
            <p className="mt-6 border-l-2 border-primary/60 pl-4 font-serif text-[16px] italic leading-relaxed text-muted-foreground">
              {article.summary}
            </p>
          )}
        </header>
        <hr className="my-10 border-border/70" />
        <div ref={contentRef}>
          <Streamdown>{article.content}</Streamdown>
        </div>
      </article>
      <Toc items={toc} activeIndex={activeIndex} onJump={jumpToHeading} />
    </div>
  );
}
