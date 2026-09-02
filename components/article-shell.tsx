import Link from 'next/link';
import type { Heading } from '@/lib/md';
import { DesktopToc } from './desktop-toc';
import { MobileTocRail } from './mobile-toc-rail';
import { ReadingProgress } from './reading-progress';
import { TagChip } from './tag-chip';
import { SparkField } from './spark-field';

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
          {/* 左侧固定目录（xl+） */}
          <DesktopToc headings={headings} />
          {/* 移动端右侧章节滑轨（<xl） */}
          <MobileTocRail headings={headings} />

          <article className="min-w-0 max-w-[45rem] flex-1">
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
                    <span className="corner" aria-hidden="true" />
                    <SparkField />
                    <div className="relative">
                      <div className="mono-label">← 上一篇</div>
                      <div className="mt-2 text-[16px] font-semibold text-ink group-hover:text-accent">{prev.title}</div>
                    </div>
                  </Link>
                ) : (
                  <div />
                )}
                {next && (
                  <Link href={next.href} className="explore-card group rounded-xl p-5 text-right">
                    <span className="corner" aria-hidden="true" />
                    <SparkField />
                    <div className="relative">
                      <div className="mono-label">下一篇 →</div>
                      <div className="mt-2 text-[16px] font-semibold text-ink group-hover:text-accent">{next.title}</div>
                    </div>
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
