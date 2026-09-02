import type { Metadata } from 'next';
import fs from 'node:fs';
import path from 'node:path';
import { getNotes } from '@/lib/content';
import { NotesBrowser } from '@/components/notes-browser';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { site } from '@/lib/site-server';

interface TaxonomyShape {
  categories: { notes: string[]; research: string[]; projects: string[] };
  chapters: Record<string, string[]>;
  tags: string[];
}
const EMPTY_TAXONOMY: TaxonomyShape = {
  categories: { notes: [], research: [], projects: [] },
  chapters: {},
  tags: [],
};

/** 动态模式：运行时读取 taxonomy.json（后台分类管理保存后实时生效） */
function getTaxonomy(): TaxonomyShape {
  try {
    return {
      ...EMPTY_TAXONOMY,
      ...JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'taxonomy.json'), 'utf-8')),
    };
  } catch {
    return EMPTY_TAXONOMY;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: site.pages.notes.title, description: site.pages.notes.desc };
}

// 动态模式：每次请求实时读取内容，后台保存后无需构建即可看到最新
export const dynamic = 'force-dynamic';

export default async function NotesPage() {
  const notes = await getNotes();
  const taxonomy = getTaxonomy();
  const items = notes.map((n) => ({
    slug: n.slug,
    title: n.title,
    date: n.date,
    summary: n.summary,
    category: n.category,
    chapter: n.chapter,
    tags: n.tags,
    order: n.order,
  }));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code={site.pages.notes.code}
          en={site.pages.notes.en}
          title={site.pages.notes.title}
          desc={site.pages.notes.desc}
        >
          <p className="mono-label mt-4">{site.pages.notes.count.replace('{n}', String(notes.length))}</p>
        </PageHeader>
      </Reveal>
      <div className="pt-8">
        <NotesBrowser
        notes={items}
        categoryOrder={taxonomy.categories.notes}
        chapterOrder={taxonomy.chapters}
      />
      </div>
    </div>
  );
}
