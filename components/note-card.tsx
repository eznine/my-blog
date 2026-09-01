import Link from 'next/link';
import type { Note } from '@/lib/content';
import { SparkField } from './spark-field';

/** 卡片只依赖这几个字段，前台笔记页列表（瘦 NoteMeta）也能直接复用 */
type CardNote = Pick<Note, 'slug' | 'title' | 'date' | 'summary' | 'category' | 'tags'>;

/**
 * 笔记卡片：保持原列表的横排布局（日期 | 标题 | 类别在右，摘要标题下一行），
 * 只在外层套上 explore-card 卡片外壳与 hover 动效（上浮 + 角标 + 火花）。
 */
export function NoteCard({ note }: { note: CardNote }) {
  const tags = note.tags.slice(0, 3);
  const extra = note.tags.length - tags.length;

  return (
    <Link href={`/notes/${note.slug}`} className="group block h-full">
      <div className="explore-card flex h-full flex-col rounded-2xl p-5">
        <span className="corner" aria-hidden="true" />
        <SparkField />
        {/* 行一：日期 | 标题 | 类别 | 标签 | READ →（横排，原列表结构） */}
        <div className="relative flex min-w-0 items-center gap-3">
          <span className="w-16 shrink-0 font-mono text-[13.5px] text-ink-soft">{note.date.slice(5)}</span>
          <h3
            className="min-w-0 flex-1 truncate text-lg leading-snug font-semibold text-ink transition-colors group-hover:text-accent"
            title={note.title}
          >
            {note.title}
          </h3>
          <span className="shrink-0 rounded-md border border-accent/40 px-2 py-0.5 font-mono text-[13px] text-accent shadow-[0_0_10px_rgba(255,75,51,0.12)] transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(255,75,51,0.25)]">
            {note.category}
          </span>
          <span className="hidden shrink-0 flex-wrap items-center gap-1.5 sm:flex">
            {tags.map((t) => (
              <span
                key={t}
                className="rounded-md border border-line/70 px-2 py-0.5 font-mono text-[12px] text-ink-soft"
              >
                {t}
              </span>
            ))}
            {extra > 0 && <span className="font-mono text-[12px] text-ink-faint">+{extra}</span>}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[13px] tracking-[0.14em] text-ink-faint transition-colors group-hover:!text-accent">
            READ
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
        {/* 行二：摘要（标题下一行） */}
        {note.summary && (
          <p className="relative mt-1.5 truncate text-[15px] leading-relaxed text-ink-soft">{note.summary}</p>
        )}
      </div>
    </Link>
  );
}