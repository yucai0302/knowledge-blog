// 站点字标：Claude icon 风格的 "LC" 几何笔画（陶橙、平切端点），任意尺寸清晰
export function LcLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <g
        transform="translate(-0.64 0)"
        stroke="#D97757"
        strokeWidth="5.5"
        strokeLinejoin="miter"
        fill="none"
      >
        {/* L */}
        <path d="M12 12 V36 H23" />
        {/* C（右侧开口） */}
        <path d="M38.19 17.13 A9.25 9.25 0 1 0 38.19 30.87" />
      </g>
    </svg>
  );
}
