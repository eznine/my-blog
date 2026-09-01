import type { Metadata } from 'next';
import { getResearch } from '@/lib/content';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { ResearchItem } from '@/components/research-item';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: site.pages.research.title,
  description: site.pages.research.desc,
};

export default async function ResearchPage() {
  const research = await getResearch();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code={site.pages.research.code}
          en={site.pages.research.en}
          title={site.pages.research.title}
          desc={site.pages.research.desc}
        >
          <p className="mono-label mt-4">{site.pages.research.count.replace('{n}', String(research.length))}</p>
        </PageHeader>
      </Reveal>
      <div className="grid gap-4 pt-8 md:grid-cols-2">
        {research.length === 0 ? (
          <p className="py-12 text-sm text-ink-faint">{site.pages.research.empty}</p>
        ) : (
          research.map((r, i) => (
            <Reveal key={r.slug} delay={Math.min(i, 4) * 70} className="h-full">
              <ResearchItem research={r} />
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}
