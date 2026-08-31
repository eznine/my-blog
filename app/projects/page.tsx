import type { Metadata } from 'next';
import { getProjects } from '@/lib/content';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { ProjectCard } from '@/components/project-card';

export const metadata: Metadata = {
  title: '项目',
  description: 'WebGIS、3D GIS、地图应用、GIS 工具与数据可视化作品集。',
};

export default async function ProjectsPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code="03"
          en="PROJECTS"
          title="项目 · 作品"
          desc="实际完成的作品——校园地图、WebGIS、3D GIS、GIS 工具、遥感应用与数据可视化。每个项目含简介、技术栈、过程与成果。"
        >
          <p className="mono-label mt-4">共 {projects.length} 个 · 持续更新</p>
        </PageHeader>
      </Reveal>
      {projects.length === 0 ? (
        <p className="py-12 text-sm text-ink-faint">还没有项目，去 content/projects/ 添加。</p>
      ) : (
        <div className="grid gap-4 pt-8 md:grid-cols-2">
          {projects.map((p, i) => (
            <Reveal key={p.slug} delay={Math.min(i, 4) * 90}>
              <ProjectCard project={p} index={i} />
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
