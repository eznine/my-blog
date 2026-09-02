import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProjects, getProjectFull, formatDate } from '@/lib/content';
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
  const project = (await getProjects()).find((p) => p.slug === slug);
  if (!project) return {};
  return { title: project.title, description: project.summary };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = (await getProjects()).find((p) => p.slug === slug);
  if (!meta) notFound();
  const project = (await getProjectFull(slug)) ?? meta;

  return (
    <ArticleShell
      kicker={`03 · PROJECT / ${project.category}`}
      title={project.title}
      dateText={formatDate(project.date)}
      tags={project.tags}
      metaExtra={
        <>
          {project.tech?.map((t) => (
            <span key={t} className="rounded-sm border border-line px-2 py-[2px] font-mono text-[11px] text-ink-soft">
              {t}
            </span>
          ))}
          {project.demo && (
            <a href={project.demo} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-strong">
              在线 Demo ↗
            </a>
          )}
          {project.github && (
            <a href={project.github} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-strong">
              GitHub ↗
            </a>
          )}
        </>
      }
      html={project.html}
      headings={extractHeadings(project.html)}
      backHref="/projects"
      backLabel="返回项目列表"
    />
  );
}
