import type { Metadata } from 'next';
import { getProjects } from '@/lib/content';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { ProjectCard } from '@/components/project-card';
import { site } from '@/lib/site';

export const metadata: Metadata = {
  title: site.pages.projects.title,
  description: site.pages.projects.desc,
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code={site.pages.projects.code}
          en={site.pages.projects.en}
          title={site.pages.projects.title}
          desc={site.pages.projects.desc}
        >
          <p className="mono-label mt-4">{site.pages.projects.count.replace('{n}', String(projects.length))}</p>
        </PageHeader>
      </Reveal>
      {projects.length === 0 ? (
        <p className="py-12 text-sm text-ink-faint">{site.pages.projects.empty}</p>
      ) : (
        <div className="grid gap-4 pt-8 md:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={Math.min(i, 4) * 90}>
              <ProjectCard project={p} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
