import Link from 'next/link';
import type { Project } from '@/lib/content';
import { SparkField } from './spark-field';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="explore-card relative flex h-full flex-col rounded-2xl p-7">
      <span className="corner" aria-hidden="true" />
      <SparkField />
      <div className="relative flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em] text-ink-faint">
        <span className="marker-dot !h-[5px] !w-[5px]" />
        {project.date} · {project.category}
      </div>
      <Link
        href={`/projects/${project.slug}`}
        className="group relative mt-5 text-[1.4rem] leading-tight font-bold text-ink transition-colors hover:text-accent"
      >
        {project.title}
      </Link>
      {project.summary && (
        <p className="relative mt-3 line-clamp-3 text-[15px] leading-relaxed text-ink-soft">{project.summary}</p>
      )}
      {project.tech && project.tech.length > 0 && (
        <div className="relative mt-4 flex flex-wrap gap-2">
          {project.tech.slice(0, 5).map((t) => (
            <span key={t} className="rounded-md border border-line px-2.5 py-1 font-mono text-[12px] text-ink-soft">
              {t}
            </span>
          ))}
        </div>
      )}
      <div className="relative mt-auto flex items-center gap-5 pt-6 text-[15px]">
        <Link href={`/projects/${project.slug}`} className="font-medium text-accent transition-colors hover:text-accent-strong">
          项目详情 →
        </Link>
        {project.demo && (
          <a href={project.demo} target="_blank" rel="noreferrer" className="text-ink-soft transition-colors hover:text-accent">
            Demo ↗
          </a>
        )}
        {project.github && (
          <a href={project.github} target="_blank" rel="noreferrer" className="text-ink-soft transition-colors hover:text-accent">
            GitHub ↗
          </a>
        )}
      </div>
    </article>
  );
}
