import Link from 'next/link';
import type { Research } from '@/lib/content';
import { TagChip } from './tag-chip';

export function ResearchItem({ research }: { research: Research }) {
  const isLive = research.status === '在研';

  return (
    <article className="group relative rounded-xl px-5 py-7 transition-colors hover:bg-accent/5">
      <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:gap-8">
        <div className="flex shrink-0 items-center gap-4 md:w-44 md:flex-col md:items-start md:gap-2.5">
          <span className="flex items-center gap-2.5 font-mono text-[13px] tracking-[0.1em] text-ink-faint">
            <span className={`marker-dot ${isLive ? 'is-live' : ''} !h-[6px] !w-[6px]`} />
            {research.date}
          </span>
          {research.status && (
            <span
              className={`rounded-md border px-2.5 py-1 font-mono text-[12px] tracking-[0.16em] ${
                isLive
                  ? 'border-accent/60 text-accent'
                  : research.status === '已发表'
                    ? 'border-line-strong text-ink-soft'
                    : 'border-line text-ink-faint'
              }`}
            >
              {research.status}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <Link
            href={`/research/${research.slug}`}
            className="text-xl leading-snug font-bold text-ink transition-colors group-hover:text-accent"
          >
            {research.title}
          </Link>
          {research.category && (
            <span className="ml-3 font-mono text-[13px] tracking-[0.1em] text-accent">{research.category}</span>
          )}
          {research.summary && (
            <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-ink-soft">{research.summary}</p>
          )}
          {research.tags.length > 0 && (
            <div className="mt-3.5 flex flex-wrap gap-2">
              {research.tags.map((t) => (
                <TagChip key={t} tag={t} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
