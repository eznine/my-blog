import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNotes, formatDate } from '@/lib/content';
import { extractHeadings } from '@/lib/md';
import { ArticleShell } from '@/components/article-shell';

export async function generateStaticParams() {
  const notes = await getNotes();
  return notes.map((n) => ({ slug: n.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const note = (await getNotes()).find((n) => n.slug === slug);
  if (!note) return {};
  return { title: note.title, description: note.summary };
}

export default async function NotePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const notes = await getNotes();
  const idx = notes.findIndex((n) => n.slug === slug);
  if (idx === -1) notFound();

  const note = notes[idx];
  const headings = extractHeadings(note.html);
  const newer = notes[idx - 1];
  const older = notes[idx + 1];

  return (
    <ArticleShell
      kicker={`01 · NOTES / ${note.category}`}
      title={note.title}
      dateText={formatDate(note.date)}
      tags={note.tags}
      html={note.html}
      headings={headings}
      backHref="/notes"
      backLabel="返回笔记列表"
      prev={newer ? { href: `/notes/${newer.slug}`, title: newer.title } : undefined}
      next={older ? { href: `/notes/${older.slug}`, title: older.title } : undefined}
    />
  );
}
