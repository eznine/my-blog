import Link from 'next/link';
import type { Note } from '@/lib/content';
import { SparkField } from './spark-field';

const COORD_POOL = ['108.94°E', '109.02°E', '108.81°E', '108.99°E', '108.76°E', '108.88°E', '109.10°E', '108.69°E'];

function coordFor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return `${34 + (h % 3)}.${(h % 90) + 10}°N ${COORD_POOL[h % COORD_POOL.length]}`;
}

export function NoteCard({ note }: { note: Note }) {
  return (
    <Link href={`/notes/${note.slug}`} className="group block h-full">
      <div className="explore-card flex h-full flex-col rounded-2xl p-6">
        <span className="corner" aria-hidden="true" />
        <SparkField />
        <div className="relative flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 font-mono text-[12px] tracking-[0.14em] text-ink-faint">
            <span className="marker-dot !h-[5px] !w-[5px]" />
            {coordFor(note.slug)}
          </span>
          <span className="rounded-md border border-line px-2 py-1 font-mono text-[12px] tracking-[0.1em] text-ink-soft transition-colors group-hover:border-accent/50 group-hover:text-accent">
            {note.category}
          </span>
        </div>
        <h3 className="relative mt-5 text-xl leading-snug font-bold text-ink transition-colors group-hover:text-accent">
          {note.title}
        </h3>
        {note.summary && (
          <p className="relative mt-3 line-clamp-2 text-[15px] leading-relaxed text-ink-soft">{note.summary}</p>
        )}
        <div className="relative mt-auto flex items-center justify-between pt-6">
          <span className="font-mono text-[13px] text-ink-faint">{note.date}</span>
          <span className="flex items-center gap-1.5 font-mono text-[12px] tracking-[0.14em] text-ink-faint transition-colors group-hover:!text-accent">
            READ
            <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
