import type { Metadata } from 'next';
import { getNotes } from '@/lib/content';
import { NotesBrowser } from '@/components/notes-browser';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: '笔记',
  description: 'GIS、遥感、空间分析、WebGIS 与编程的学习笔记与知识库。',
};

export default async function NotesPage() {
  const notes = await getNotes();
  const items = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    date: n.date,
    summary: n.summary,
    category: n.category,
    tags: n.tags,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code="01"
          en="NOTES"
          title="笔记 · 知识库"
          desc="GIS、遥感、空间分析、WebGIS、编程与相关软件的学习记录——每个方向下的知识点、技术与实践案例，随学习不断扩展。"
        >
          <p className="mono-label mt-4">共 {notes.length} 篇 · 支持按分类 / 标签 / 关键词筛选</p>
        </PageHeader>
      </Reveal>
      <div className="pt-8">
        <NotesBrowser notes={items} />
      </div>
    </div>
  );
}
