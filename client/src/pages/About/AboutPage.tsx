import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  ArrowUpRight,
  Check,
  Copy,
  Github,
  GraduationCap,
  Heart,
  Mail,
  MessageCircle,
  Coffee,
  Compass,
} from 'lucide-react';

// TODO: 换成你自己的信息
const GITHUB_PROFILE = 'https://github.com/your-github-name';
const TRAE_FORUM = 'https://forum.trae.cn/u/your-name/summary';
const WECHAT_ID = 'your_wechat_id';
const CONTACT_EMAIL = 'you@example.com';

const SITE_LAUNCH = '2026-08-17'; // 建站时间，用于计算运行天数

/** 复制按钮（微信号无法点击跳转，提供一键复制） */
function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="复制微信号"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
        } catch {
          const el = document.createElement('textarea');
          el.value = value;
          document.body.appendChild(el);
          el.select();
          document.execCommand('copy');
          document.body.removeChild(el);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-all hover:border-primary/50 hover:text-primary active:scale-90"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

/** 首屏视觉：LC 字标 + 渐变姓名 + 打字机标语 */
function Hero() {
  const slogan = '把工程写进博客，把好奇心写进代码。';
  const [typed, setTyped] = useState('');

  useEffect(() => {
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setTyped(slogan.slice(0, i));
      if (i >= slogan.length) clearInterval(timer);
    }, 90);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-card px-7 py-10 md:px-12 md:py-14">
      {/* 背景装饰光晕 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full opacity-25 blur-3xl"
        style={{ background: 'radial-gradient(circle, #d97757 0%, transparent 65%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-28 -left-16 h-64 w-64 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #8a9a5b 0%, transparent 65%)' }}
      />

      <div className="relative">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">About Me</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
          你好，我是{' '}
          <span className="bg-gradient-to-r from-primary via-[#b05c3b] to-[#8a9a5b] bg-clip-text text-transparent">
            Your Name
          </span>
        </h1>
        <p className="mt-3 min-h-[1.75rem] font-serif text-[15px] leading-relaxed text-muted-foreground">
          {typed}
          <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-primary align-[-2px]" />
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {['AI 工程', 'Agent 实践', 'Loop Engineering', '独立开发'].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border bg-background px-3 py-1 text-[12px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

const CONTACTS = [
  {
    icon: Github,
    title: 'GitHub',
    desc: '我的代码基地 · @your-github-name',
    href: GITHUB_PROFILE,
    value: 'github.com/your-github-name',
  },
  {
    icon: GraduationCap,
    title: 'Trae 社区',
    desc: '我在社区的主页 · your-name',
    href: TRAE_FORUM,
    value: 'forum.trae.cn/u/your-name',
  },
  {
    icon: Mail,
    title: '邮箱',
    desc: '最可靠的联系渠道',
    href: `mailto:${CONTACT_EMAIL}`,
    value: CONTACT_EMAIL,
  },
];

export default function AboutPage() {
  const days = Math.max(1, dayjs().diff(dayjs(SITE_LAUNCH), 'day'));

  useEffect(() => {
    document.title = '关于 · My Blog';
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl px-6 pb-6 pt-12 md:pt-16">
      <Hero />

      {/* 联系方式 */}
      <h2 className="mt-12 flex items-center gap-2 text-lg font-semibold tracking-tight">
        <Compass className="h-4.5 w-4.5 text-primary" />
        在这些地方找到我
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {CONTACTS.map(({ icon: Icon, title, desc, href, value }) => (
          <a
            key={title}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            className="group relative flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
          >
            <ArrowUpRight className="absolute right-4 top-4 h-3.5 w-3.5 text-muted-foreground/40 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary group-hover:opacity-100" />
            <Icon className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{title}</p>
            <p className="mt-0.5 text-[12px] text-muted-foreground">{desc}</p>
            <p className="mt-2.5 truncate text-[11px] tabular-nums text-muted-foreground/60">{value}</p>
          </a>
        ))}
        {/* 微信号：无链接，一键复制 */}
        <div className="relative flex flex-col rounded-2xl border border-dashed border-border bg-card p-5 transition-colors hover:border-primary/40">
          <MessageCircle className="h-5 w-5 text-primary" />
          <p className="mt-3 text-sm font-semibold">微信</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">加好友请备注来意</p>
          <div className="mt-2.5 flex items-center justify-between gap-2">
            <span className="truncate font-mono text-[12px] font-medium text-foreground/80">{WECHAT_ID}</span>
            <CopyButton value={WECHAT_ID} />
          </div>
        </div>
      </div>

      {/* 页面彩蛋说明 */}
      <div className="mt-12 rounded-2xl border border-border/70 bg-muted/40 px-6 py-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Coffee className="h-4 w-4 text-primary" />
          关于一台服务器的自我修养
        </h2>
        <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-muted-foreground">
          <li>
            · 本站已稳定运行{' '}
            <span className="font-medium tabular-nums text-primary">{days}</span>{' '}
            天——比大多数人的新年计划坚持得久。
          </li>
          <li>· 所有文章均由人类亲自撰写、AI 亲自校对，如有错误，责任归算力。</li>
          <li>· 点赞不需要登录，感谢也不重样（感受 AI 彩虹屁的臭味）。</li>
          <li>· 站点不接受付费推广，因为没人与我联系（邮箱是真的，欢迎打破）。</li>
          <li>· 如果页面加载变慢，请刷新一下；如果内容让你变强，请常来。</li>
        </ul>
      </div>

      {/* 底部签名 */}
      <p className="mt-10 flex items-center justify-center gap-1.5 text-center text-[12px] text-muted-foreground/70">
        用 TraeCode <Heart className="h-3 w-3 fill-primary text-primary" /> 和 TypeScript 构建 · 由妙搭驱动
      </p>
    </div>
  );
}
