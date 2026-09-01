import type { Metadata } from 'next';
import { getNotes } from '@/lib/content';
import { NotesBrowser } from '@/components/notes-browser';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { site } from '@/lib/site';
import taxonomy from '@/content/taxonomy.json';

export const metadata: Metadata = {
  title: site.pages.notes.title,
  description: site.pages.notes.desc,
};

export default async function NotesPage() {
  const notes = await getNotes();
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
