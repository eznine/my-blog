import type { Metadata } from 'next';
import Link from 'next/link';
import { getNotes, getResearch, getProjects } from '@/lib/content';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: site.pages.archive.title,
  description: site.pages.archive.desc,
};

export default async function ArchivePage() {
  const [notes, research, projects] = await Promise.all([getNotes(), getResearch(), getProjects()]);

  const all = [
    ...notes.map((n) => ({ date: n.date, title: n.title, href: `/notes/${n.slug}`, type: site.pages.archive.typeNote, category: n.category })),
    ...research.map((r) => ({ date: r.date, title: r.title, href: `/research/${r.slug}`, type: site.pages.archive.typeResearch, category: r.category })),
    ...projects.map((p) => ({ date: p.date, title: p.title, href: `/projects/${p.slug}`, type: site.pages.archive.typeProject, category: p.category })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const years = [...new Set(all.map((i) => i.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a));

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code={site.pages.archive.code}
          en={site.pages.archive.en}
          title={site.pages.archive.title}
          desc={site.pages.archive.desc}
        >
          <p className="mono-label mt-4">
            {site.pages.archive.count
              .replace('{total}', String(all.length))
              .replace('{notes}', String(notes.length))
              .replace('{research}', String(research.length))
              .replace('{projects}', String(projects.length))}
          </p>
        </PageHeader>
      </Reveal>

      {all.length === 0 ? (
        <p className="py-12 text-sm text-ink-faint">{site.pages.archive.empty}</p>
      ) : (
        years.map((year, yi) => (
          <Reveal key={year} delay={Math.min(yi, 3) * 80}>
            <section className="mt-10 first:mt-8">
              <h2 className="flex items-baseline gap-3 font-mono text-lg font-bold tracking-[0.2em] text-accent">
                {year}
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] font-normal text-ink-faint">
                  {all.filter((i) => i.date.startsWith(year)).length}
                </span>
              </h2>
              <ul>
                {all
                  .filter((i) => i.date.startsWith(year))
                  .map((item) => (
                    <li key={item.href} className="group border-b border-line">
                      <Link href={item.href} className="flex flex-col gap-1 py-3.5 sm:flex-row sm:items-baseline sm:gap-5">
                        <span className="w-24 shrink-0 font-mono text-[13px] text-ink-faint">{item.date.slice(5)}</span>
                        <span className="shrink-0 rounded-sm border border-line px-1.5 py-[2px] font-mono text-[10px] tracking-widest text-ink-soft group-hover:border-accent group-hover:text-accent">
                          {item.type}
                        </span>
                        <span className="min-w-0 flex-1 text-[17px] font-semibold text-ink transition-colors group-hover:text-accent">
                          {item.title}
                        </span>
                        <span className="shrink-0 font-mono text-[12.5px] text-ink-faint">{item.category}</span>
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          </Reveal>
        ))
      )}
    </div>
  );
}
