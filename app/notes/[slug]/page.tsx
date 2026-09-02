import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getNotes, getNoteFull, formatDate } from '@/lib/content';
import { extractHeadings } from '@/lib/md';
import { ArticleShell } from '@/components/article-shell';

// 动态模式：每次请求实时读取内容，后台保存后无需构建即可看到最新
export const dynamic = 'force-dynamic';

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

  const note = (await getNoteFull(slug)) ?? notes[idx];
  const headings = extractHeadings(note.html);

  /* Demo：站内路径（/demos/...、/uploads/...）补 basePath 前缀（GitHub Pages 部署在子路径下），外链原样。
   * 目录路径（以 / 结尾）补 index.html——Next 静态服务不做目录解析，/demos/x/ 会 404（GH Pages/Nginx 会自动解析） */
  const base = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const demo = note.demo
    ? {
        src: /^(https?:|\/\/|data:)/.test(note.demo)
          ? note.demo
          : `${base}${/\/$/.test(note.demo) ? `${note.demo}index.html` : note.demo}`,
        label: note.demoLabel,
        height: note.demoHeight,
      }
    : undefined;

  /* 相邻文章：同章节（同大类+同章节）优先切换；章节内只有本篇时回退到同大类 */
  const inChapter = notes.filter((n) => (n.category ?? '') === (note.category ?? '') && (n.chapter ?? '') === (note.chapter ?? ''));
  const pool = (
    note.chapter && inChapter.length > 1 ? inChapter : notes.filter((n) => (n.category ?? '') === (note.category ?? ''))
  ).sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, 'zh')); // 旧 → 新
  const i = pool.findIndex((n) => n.slug === slug);
  const older = i > 0 ? pool[i - 1] : undefined; // 较旧一篇 → 左侧「上一篇」
  const newer = i >= 0 && i < pool.length - 1 ? pool[i + 1] : undefined; // 较新一篇 → 右侧「下一篇」

  return (
    <ArticleShell
      kicker={`01 · NOTES / ${note.category}`}
      title={note.title}
      dateText={formatDate(note.date)}
      tags={note.tags}
      demo={demo}
      html={note.html}
      headings={headings}
      backHref="/notes"
      backLabel="返回笔记列表"
      prev={older ? { href: `/notes/${older.slug}`, title: older.title } : undefined}
      next={newer ? { href: `/notes/${newer.slug}`, title: newer.title } : undefined}
    />
  );
}
