import Link from 'next/link';
import type { Note } from '@/lib/content';
import { SparkField } from './spark-field';

/** 卡片只依赖这几个字段，前台笔记页列表（瘦 NoteMeta）也能直接复用 */
type CardNote = Pick<Note, 'slug' | 'title' | 'date' | 'summary' | 'category' | 'tags'>;

/**
 * 笔记卡片：桌面端保持原列表的横排布局（日期 | 标题 | 类别 | 标签 | READ），
 * 窄屏改为日期 / 标题 / 类别与 READ 三行，避免标题被挤成一两个字。
 * 默认点缀（不 hover 也可见）：日期前常驻呼吸红点 + 左上网格纹理，让卡片不显空。
 */
export function NoteCard({ note }: { note: CardNote }) {
  const tags = note.tags.slice(0, 3);
  const extra = note.tags.length - tags.length;

  return (
    <Link href={`/notes/${note.slug}`} className="group block h-full">
      <div className="explore-card flex h-full flex-col rounded-2xl p-4 sm:p-5">
        <span className="corner" aria-hidden="true" />
        {/* 左上角淡网格纹理（制图坐标网隐喻，常驻） */}
        <span className="card-grid" aria-hidden="true" />
        <SparkField />
        {/* 窄屏：日期 / 标题 / 类别 + READ；sm+：原横排结构 */}
        <div className="relative flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
          <span className="flex shrink-0 items-center gap-2">
            <span className="marker-dot is-live" aria-hidden="true" />
            <span className="font-mono text-[13.5px] text-ink-soft sm:w-16">{note.date.slice(5)}</span>
          </span>
          <h3
            className="line-clamp-2 min-w-0 flex-1 text-lg leading-snug font-semibold text-ink transition-colors group-hover:text-accent sm:line-clamp-1 sm:truncate"
            title={note.title}
          >
            {note.title}
          </h3>
          <span className="flex shrink-0 items-center justify-between gap-2 sm:contents">
            <span className="max-w-[10rem] truncate rounded-md border border-accent/40 px-2 py-0.5 font-mono text-[13px] text-accent shadow-[0_0_10px_rgba(255,75,51,0.12)] transition-all duration-300 group-hover:shadow-[0_0_16px_rgba(255,75,51,0.25)] sm:max-w-none sm:shrink-0">
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
            <span className="flex shrink-0 items-center gap-1.5 font-mono text-[12px] tracking-[0.14em] text-ink-faint transition-colors group-hover:!text-accent sm:text-[13px]">
              READ
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </span>
          </span>
        </div>
        {/* 摘要：标题下一行，窄屏保持单行截断，避免卡片过高 */}
        {note.summary && (
          <p className="line-clamp-1 relative mt-1.5 text-[15px] leading-relaxed text-ink-soft">{note.summary}</p>
        )}
      </div>
    </Link>
  );
}
