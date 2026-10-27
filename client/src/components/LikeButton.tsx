import { useCallback, useEffect, useRef, useState } from 'react';
import { Heart } from 'lucide-react';
import { toast } from 'sonner';

import { fetchLikeTotal, postLike } from '@client/src/api';

const CLIENT_ID_KEY = 'blog_client_id';
const SESSION_THANKED_KEY = 'blog_thanked_this_session';

/** 稳定的浏览器标识（无需登录，仅用于后端记录点赞来源） */
function getClientId(): string {
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

const fmtCount = (n: number) =>
  new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

/** 感谢弹窗：每次打开网页后的第一次点赞触发，展示后端随机短句 */
function showThanksToast(thanks: string, total: number) {
  toast.custom(
    () => (
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/95 px-6 py-5 shadow-2xl backdrop-blur">
        <div className="flex items-start gap-4">
          <span className="relative mt-0.5 inline-flex shrink-0">
            <Heart
              className="absolute inset-0 h-6 w-6 animate-ping text-primary/40"
              fill="currentColor"
              strokeWidth={0}
            />
            <Heart className="h-6 w-6 text-primary" fill="currentColor" strokeWidth={0} />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-relaxed tracking-tight">{thanks}</p>
            <p className="mt-2 text-[13px] text-muted-foreground">
              你是第 <span className="font-medium tabular-nums text-primary">{fmtCount(total)}</span> 位点赞的朋友
              ，谢谢你的心意
            </p>
          </div>
        </div>
      </div>
    ),
    { duration: 6000 },
  );
}

/** 全站点赞按钮：无需登录，任何人点击都计入统计 */
export function LikeButton() {
  const [total, setTotal] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const cooldown = useRef(false);

  useEffect(() => {
    fetchLikeTotal()
      .then(setTotal)
      .catch(() => setTotal(null));
  }, []);

  const handleClick = useCallback(async () => {
    if (cooldown.current) return;
    cooldown.current = true;
    setBurst(true);
    setTimeout(() => setBurst(false), 350);

    try {
      const { total: newTotal, thanks } = await postLike(getClientId());
      setTotal(newTotal);
      // 每次打开网页后的第一次点赞才弹感谢窗
      if (!sessionStorage.getItem(SESSION_THANKED_KEY)) {
        sessionStorage.setItem(SESSION_THANKED_KEY, '1');
        showThanksToast(thanks, newTotal);
      }
    } catch {
      // 点赞失败静默处理，不打断阅读
    } finally {
      setTimeout(() => {
        cooldown.current = false;
      }, 1500);
    }
  }, []);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="点赞"
      title="给博主一点鼓励"
      className={`group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm tabular-nums transition-all hover:border-primary/50 hover:text-primary active:scale-95 ${
        burst ? 'border-primary/60 text-primary' : 'text-muted-foreground'
      }`}
    >
      <Heart
        className={`h-4 w-4 transition-transform duration-300 ${burst ? 'scale-125 text-primary' : 'group-hover:scale-110'}`}
        fill={burst ? 'currentColor' : 'none'}
        strokeWidth={2}
      />
      <span>{total === null ? '—' : fmtCount(total)}</span>
    </button>
  );
}
