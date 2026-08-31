import Link from 'next/link';
import type { Heading } from '@/lib/md';
import { ArticleToc } from './toc';
import { DesktopToc } from './desktop-toc';
import { ReadingProgress } from './reading-progress';
import { TagChip } from './tag-chip';

export interface AdjacentLink {
  href: string;
  title: string;
}

export function ArticleShell({
  kicker,
  title,
  dateText,
  tags,
  metaExtra,
  html,
  headings,
  backHref,
  backLabel,
  prev,
  next,
}: {
  kicker: string;
  title: string;
  dateText: string;
  tags?: string[];
  metaExtra?: React.ReactNode;
  html: string;
  headings: Heading[];
  backHref: string;
  backLabel: string;
  prev?: AdjacentLink;
  next?: AdjacentLink;
}) {
  return (
    <>
      <ReadingProgress />
      <div className="mx-auto max-w-6xl px-6 pb-10 pt-10 md:pt-14">
        <Link
          href={backHref}
          className="group inline-flex items-center gap-2 font-mono text-[12px] tracking-[0.18em] text-ink-faint uppercase transition-colors hover:text-accent"
        >
          <span className="inline-block transition-transform duration-300 group-hover:-translate-x-1.5">←</span>
          {backLabel}
        </Link>

        <div className="mt-8 flex gap-12">
          {/* 左侧固定目录 */}
          <DesktopToc headings={headings} />

          <article className="min-w-0 max-w-[45rem] flex-1">
            {/* 窄屏下拉目录 */}
            <ArticleToc headings={headings} />

            <header className="page-enter">
              <div className="mono-label flex items-center gap-2.5 !text-accent">
                <span className="marker-dot is-live !h-[5px] !w-[5px]" />
                {kicker}
              </div>
              <h1 className="mt-4 text-[2rem] leading-tight font-black tracking-tight text-ink md:text-[2.6rem]">
                {title}
              </h1>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2.5 border-b border-line pb-7 text-[15px] text-ink-soft">
                <span className="font-mono text-[13px] tracking-[0.08em]">{dateText}</span>
                {metaExtra}
              </div>
            </header>

            <div
              className="md-body mt-9 page-enter"
              style={{ animationDelay: '120ms' }}
              dangerouslySetInnerHTML={{ __html: html }}
            />

            {tags && tags.length > 0 && (
              <div className="mt-14 flex flex-wrap items-center gap-2.5 border-t border-line pt-7">
                <span className="mono-label mr-1">TAGS</span>
                {tags.map((t) => (
                  <TagChip key={t} tag={t} clickable />
                ))}
              </div>
            )}

            {(prev || next) && (
              <nav className="mt-9 grid gap-4 border-t border-line pt-7 sm:grid-cols-2">
                {prev ? (
                  <Link
                    href={prev.href}
                    className="explore-card group rounded-xl p-5"
                  >
                    <div className="mono-label">← 较新一篇</div>
                    <div className="mt-2 text-[16px] font-semibold text-ink group-hover:text-accent">{prev.title}</div>
                  </Link>
                ) : (
                  <div />
                )}
                {next && (
                  <Link href={next.href} className="explore-card group rounded-xl p-5 text-right">
                    <div className="mono-label">较旧一篇 →</div>
                    <div className="mt-2 text-[16px] font-semibold text-ink group-hover:text-accent">{next.title}</div>
                  </Link>
                )}
              </nav>
            )}
          </article>
        </div>
      </div>
    </>
  );
}
