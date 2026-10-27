import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { ArrowUpRight, GitFork, Loader2, Mail, Star } from 'lucide-react';

// TODO: 换成你自己的 GitHub 用户名 / 邮箱 / 想展示的仓库
const GITHUB_PROFILE = 'https://github.com/your-github-name';
const GITHUB_OWNER = 'your-github-name';
const CONTACT_EMAIL = 'you@example.com';

interface RepoCard {
  name: string;
  description: string;
  language: string | null;
  stars: number;
  forks: number;
  pushedAt: string | null;
  license: string | null;
  topics: string[];
}

// 展示顺序即页面顺序；fallback 为 API 不可达（限流等）时的兜底数据
const REPO_ORDER = ['your-repo-one', 'your-repo-two'];
const FALLBACK: Record<string, RepoCard> = {
  'your-repo-one': {
    name: 'your-repo-one',
    description: '在这里填写你的第一个开源项目简介。',
    language: 'TypeScript',
    stars: 0,
    forks: 0,
    pushedAt: null,
    license: null,
    topics: [],
  },
  'your-repo-two': {
    name: 'your-repo-two',
    description: '在这里填写你的第二个开源项目简介。',
    language: 'Python',
    stars: 0,
    forks: 0,
    pushedAt: null,
    license: null,
    topics: [],
  },
};

const LANG_COLORS: Record<string, string> = {
  Python: '#3572A5',
  Shell: '#89e051',
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Go: '#00ADD8',
  Rust: '#dea584',
  Java: '#b07219',
  HTML: '#e34c26',
  CSS: '#563d7c',
};

const fmtCount = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function RepoCardItem({ repo }: { repo: RepoCard }) {
  const langColor = repo.language ? (LANG_COLORS[repo.language] ?? '#d97757') : null;
  return (
    <a
      href={`${GITHUB_PROFILE}/${repo.name}`}
      target="_blank"
      rel="noreferrer"
      className="group block rounded-2xl border border-border bg-card p-6 transition-all hover:border-foreground/25 hover:shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[17px] font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
            <span className="font-normal text-muted-foreground/70">{GITHUB_OWNER}/</span>
            {repo.name}
          </h2>
          <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {repo.description || '暂无描述'}
          </p>
        </div>
        <ArrowUpRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>

      {repo.topics.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-1.5">
          {repo.topics.slice(0, 5).map((t) => (
            <span
              key={t}
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
            >
              {t}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium tabular-nums text-foreground/80">
          <Star className="h-3.5 w-3.5 fill-primary text-primary" />
          {fmtCount(repo.stars)}
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <GitFork className="h-3.5 w-3.5" />
          {fmtCount(repo.forks)}
        </span>
        {repo.language && (
          <span className="inline-flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full border border-border/60"
              style={{ backgroundColor: langColor ?? 'transparent' }}
            />
            {repo.language}
          </span>
        )}
        {repo.license && <span>{repo.license}</span>}
        {repo.pushedAt && <span className="tabular-nums">{dayjs(repo.pushedAt).format('YYYY-MM-DD')} 更新</span>}
      </div>
    </a>
  );
}

export default function ProjectsPage() {
  const [repos, setRepos] = useState<RepoCard[] | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    document.title = 'Github · My Blog';
  }, []);

  useEffect(() => {
    let cancelled = false;
    // GitHub 公开 API 支持跨域，无需鉴权；失败（限流/断网）时用兜底数据
    Promise.all(
      REPO_ORDER.map((name) =>
        fetch(`https://api.github.com/repos/${GITHUB_OWNER}/${name}`).then((res) =>
          res.ok ? res.json() : null,
        ),
      ),
    )
      .then((datas) => {
        if (cancelled) return;
        const cards = REPO_ORDER.map((name, i) => {
          const d = datas[i];
          if (d && typeof d.stargazers_count === 'number') {
            setLive(true);
            return {
              name,
              description: d.description ?? '',
              language: d.language ?? null,
              stars: d.stargazers_count,
              forks: d.forks_count ?? 0,
              pushedAt: d.pushed_at ?? null,
              license: d.license?.spdx_id ?? null,
              topics: Array.isArray(d.topics) ? d.topics.slice(0, 5) : [],
            } satisfies RepoCard;
          }
          return FALLBACK[name];
        });
        if (!cancelled) setRepos(cards);
      })
      .catch(() => {
        if (!cancelled) setRepos(REPO_ORDER.map((n) => FALLBACK[n]));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const totalStars = repos?.reduce((s, r) => s + r.stars, 0) ?? 0;

  return (
    <div className="mx-auto w-full max-w-3xl px-6">
      {/* 刊头 */}
      <div className="pb-10 pt-12 md:pt-16">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">Open Source</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">Github</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          一些围绕 AI 工程与 Agent 的 side projects
          {repos && totalStars > 0 ? (
            <>
              {' '}
              · 共 <span className="tabular-nums">{fmtCount(totalStars)}</span> stars
              {!live && <span className="text-muted-foreground/60">（缓存数据）</span>}
            </>
          ) : (
            ''
          )}
        </p>
      </div>

      {/* 仓库卡片 */}
      {repos === null ? (
        <div className="flex items-center gap-2 py-20 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中…
        </div>
      ) : (
        <div className="grid gap-4 pb-4">
          {repos.map((r) => (
            <RepoCardItem key={r.name} repo={r} />
          ))}
        </div>
      )}

      {/* GitHub 主页 + 联系邮箱 */}
      <div className="my-6 grid gap-4 sm:grid-cols-2">
        <a
          href={GITHUB_PROFILE}
          target="_blank"
          rel="noreferrer"
          className="group flex items-center justify-between rounded-2xl border border-dashed border-border px-6 py-5 transition-colors hover:border-foreground/30"
        >
          <div>
            <p className="text-sm font-medium">在 GitHub 上关注我</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">更多实验性项目与日常提交</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground transition-colors group-hover:text-primary">
            @{GITHUB_OWNER}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </a>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="group flex items-center justify-between rounded-2xl border border-dashed border-border px-6 py-5 transition-colors hover:border-foreground/30"
        >
          <div>
            <p className="text-sm font-medium">联系我</p>
            <p className="mt-0.5 text-[13px] text-muted-foreground">交流、反馈与合作</p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1.5 text-[13px] text-muted-foreground transition-colors group-hover:text-primary">
            <Mail className="h-3.5 w-3.5" />
            <span className="hidden md:inline">{CONTACT_EMAIL}</span>
          </span>
        </a>
      </div>
    </div>
  );
}
