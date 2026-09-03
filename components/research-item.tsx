import Link from 'next/link';
import type { Research } from '@/lib/content';
import { SparkField } from './spark-field';
import { TagChip } from './tag-chip';

/**
 * 研究卡片：有封面（cover）时横排——封面在左、内容在右（研究页一行一个）；
 * 无封面时保持原纵向布局（首页/窄屏复用）。
 */
export function ResearchItem({ research }: { research: Research }) {
  const isLive = research.status === '在研';
  const hasCover = !!research.cover;

  const metaRow = (
    <div className="relative flex items-center justify-between gap-3">
      <span className="flex items-center gap-2.5 font-mono text-[13px] tracking-[0.1em] text-ink-faint">
        <span className={`marker-dot ${isLive ? 'is-live' : ''} !h-[5px] !w-[5px]`} />
        {research.date}
      </span>
      {research.status && (
        <span
          className={`rounded-md border px-2.5 py-1 font-mono text-[12px] tracking-[0.16em] transition-colors group-hover:border-accent/60 group-hover:text-accent ${
            isLive ? 'border-accent/60 text-accent' : 'border-line text-ink-faint'
          }`}
        >
          {research.status}
        </span>
      )}
    </div>
  );

  const body = (
    <>
      <Link
        href={`/research/${research.slug}`}
        className="relative mt-4 text-xl leading-snug font-bold text-ink transition-colors group-hover:text-accent"
      >
        {research.title}
      </Link>
      {research.category && (
        <span className="relative mt-1.5 font-mono text-[12px] tracking-[0.14em] text-accent">{research.category}</span>
      )}
      {research.summary && (
        <p className="relative mt-2.5 line-clamp-3 text-[15px] leading-relaxed text-ink-soft">{research.summary}</p>
      )}
      {research.tags.length > 0 && (
        <div className="relative mt-3 flex flex-wrap gap-2">
          {research.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
      <div className="relative mt-auto flex items-center justify-between pt-5">
        <span className="font-mono text-[12px] tracking-[0.14em] text-ink-faint">READ</span>
        <span className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.14em] text-ink-faint transition-colors group-hover:!text-accent">
          DETAIL
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </>
  );

  /* 无封面：原纵向卡片 */
  if (!hasCover) {
    return (
      <article className="explore-card group relative flex h-full flex-col rounded-2xl p-6">
        <span className="corner" aria-hidden="true" />
        <SparkField />
        {metaRow}
        {body}
      </article>
    );
  }

  /* 有封面：横排——封面左（约 1/3），内容右 */
  return (
    <article className="explore-card group relative flex h-full flex-col overflow-hidden rounded-2xl sm:flex-row">
      <span className="corner" aria-hidden="true" />
      <SparkField />
      <Link
        href={`/research/${research.slug}`}
        className="relative block h-44 w-full shrink-0 overflow-hidden sm:h-auto sm:w-[220px] lg:w-[240px]"
        aria-label={research.title}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={research.cover}
          alt=""
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent to-[color-mix(in_srgb,var(--bg)_55%,transparent)] sm:to-transparent sm:bg-gradient-to-t sm:from-[color-mix(in_srgb,var(--bg)_40%,transparent)]" />
      </Link>
      <div className="relative flex min-w-0 flex-1 flex-col p-6">{metaRow}{body}</div>
    </article>
  );
}
