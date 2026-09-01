import Link from 'next/link';
import type { Research } from '@/lib/content';
import { SparkField } from './spark-field';
import { TagChip } from './tag-chip';

export function ResearchItem({ research }: { research: Research }) {
  const isLive = research.status === '在研';

  return (
    <article className="explore-card group relative flex h-full flex-col rounded-2xl p-6">
      <span className="corner" aria-hidden="true" />
      <SparkField />
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
      <Link
        href={`/research/${research.slug}`}
        className="relative mt-5 text-xl leading-snug font-bold text-ink transition-colors group-hover:text-accent"
      >
        {research.title}
      </Link>
      {research.category && (
        <span className="relative mt-2 font-mono text-[12px] tracking-[0.14em] text-accent">{research.category}</span>
      )}
      {research.summary && (
        <p className="relative mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-soft">{research.summary}</p>
      )}
      {research.tags.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {research.tags.map((t) => (
            <TagChip key={t} tag={t} />
          ))}
        </div>
      )}
      <div className="relative mt-auto flex items-center justify-between pt-6">
        <span className="font-mono text-[12px] tracking-[0.14em] text-ink-faint">READ</span>
        <span className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.14em] text-ink-faint transition-colors group-hover:!text-accent">
          DETAIL
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </div>
    </article>
  );
}