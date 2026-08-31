import Link from 'next/link';
import { getNotes, getProjects, getResearch } from '@/lib/content';
import { site } from '@/lib/site';
import { HeroScroll } from '@/components/hero-scroll';
import { Reveal } from '@/components/reveal';
import { SparkField } from '@/components/spark-field';
import { NoteCard } from '@/components/note-card';
import { ProjectCard } from '@/components/project-card';
import { ResearchItem } from '@/components/research-item';

const AREA_PATHS: Record<string, string> = {
  RS: 'M3 8.5 12 4l9 4.5-9 4.5-9-4.5Zm0 4.5L12 17.5 21 13M3 16l9 4.5 9-4.5',
  SA: 'M4 20 20 4M4 4h6v6M20 20h-6v-6',
  WG: 'M12 2a10 10 0 1 0 10 10h-10V2Z',
  DEV: 'm8 6-6 6 6 6M16 6l6 6-6 6',
};

function SectionHeading({
  code,
  en,
  title,
  href,
  linkLabel = '查看全部',
}: {
  code: string;
  en: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-10 flex flex-wrap items-end justify-between gap-5">
      <Reveal variant="left">
        <div className="mono-label flex items-center gap-3 !text-accent">
          <span className="marker-dot is-live" />
          {code} · {en}
        </div>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-ink draw-line is-in md:text-4xl">
          {title}
        </h2>
      </Reveal>
      {href && (
        <Reveal variant="right">
          <Link
            href={href}
            className="group shrink-0 rounded-lg border border-line px-5 py-2.5 text-[15px] font-medium text-ink-soft transition-all hover:border-accent/60 hover:text-accent"
          >
            {linkLabel}
            <span className="ml-1.5 inline-block transition-transform duration-300 group-hover:translate-x-1.5">→</span>
          </Link>
        </Reveal>
      )}
    </div>
  );
}

export default async function HomePage() {
  const [notes, research, projects] = await Promise.all([getNotes(), getResearch(), getProjects()]);

  return (
    <div>
      {/* ================= HERO：滚动驱动的开场（等高线放大 + 文字浮现） ================= */}
      <HeroScroll notes={notes.length} research={research.length} projects={projects.length} />

      <div className="mx-auto max-w-6xl px-6">
        {/* ================= 方向 ================= */}
        <section className="pt-24 md:pt-28">
          <SectionHeading code="00" en="DIRECTIONS" title="我在做什么" />
          <div className="grid gap-6 sm:grid-cols-2">
            {site.focusAreas.map((f, i) => (
              <Reveal key={f.code} variant="scale" delay={i * 100}>
                <div className="explore-card group h-full rounded-2xl p-7">
                  <span className="corner" aria-hidden="true" />
                  <SparkField />
                  <div className="relative flex items-start justify-between">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-11 w-11 text-ink transition-all duration-500 group-hover:scale-110 group-hover:text-accent"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d={AREA_PATHS[f.code] ?? AREA_PATHS.RS} />
                    </svg>
                    <span className="ghost-num text-5xl">0{i + 1}</span>
                  </div>
                  <h3 className="relative mt-6 text-xl font-bold text-ink">{f.title}</h3>
                  <p className="relative mt-3 text-[15px] leading-relaxed text-ink-soft">{f.desc}</p>
                  <div className="relative mt-6 flex items-center gap-2.5 font-mono text-[12px] tracking-[0.2em] text-ink-faint">
                    <span className="marker-dot !h-[5px] !w-[5px] transition-colors group-hover:!bg-accent" />
                    SECTOR {f.code}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ================= 最新笔记 ================= */}
        <section className="pt-24 md:pt-28">
          <SectionHeading code="01" en="LATEST NOTES" title="最近的笔记" href="/notes" linkLabel="全部笔记" />
          {notes.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-3">
              {notes.slice(0, 3).map((n, i) => (
                <Reveal key={n.slug} variant="up" delay={i * 110}>
                  <NoteCard note={n} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="py-8 text-ink-faint">还没有笔记，去 content/notes/ 写第一篇吧。</p>
          )}
        </section>

        {/* ================= 最近研究 ================= */}
        <section className="pt-24 md:pt-28">
          <SectionHeading code="02" en="RESEARCH" title="最近的研究" href="/research" linkLabel="全部研究" />
          {research.length > 0 ? (
            <Reveal variant="up">
              <div className="rounded-2xl border border-line glass p-3">
                {research.slice(0, 2).map((r) => (
                  <ResearchItem key={r.slug} research={r} />
                ))}
              </div>
            </Reveal>
          ) : (
            <p className="py-8 text-ink-faint">还没有研究记录。</p>
          )}
        </section>

        {/* ================= 最新项目 ================= */}
        <section className="pt-24 md:pt-28">
          <SectionHeading code="03" en="PROJECTS" title="最近的项目" href="/projects" linkLabel="全部项目" />
          {projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {projects.slice(0, 2).map((p, i) => (
                <Reveal key={p.slug} variant="up" delay={i * 110}>
                  <ProjectCard project={p} />
                </Reveal>
              ))}
            </div>
          ) : (
            <p className="py-8 text-ink-faint">还没有项目。</p>
          )}
        </section>

        {/* ================= 尾注 ================= */}
        <section className="relative my-24 overflow-hidden rounded-2xl border border-line py-20 text-center md:my-28">
          <div className="map-grid absolute inset-0" aria-hidden="true" />
          <Reveal variant="blur">
            <div className="relative">
              <span className="marker-dot is-live mx-auto block !h-3 !w-3" />
              <p className="mt-6 font-mono text-sm tracking-[0.28em] text-ink-faint uppercase">
                地图尚未完成 · 探索仍在继续
              </p>
              <p className="mt-5 text-2xl font-bold text-ink md:text-3xl">
                全部内容收录于{' '}
                <Link href="/archive" className="text-accent transition-colors hover:text-accent-strong">
                  归档
                </Link>{' '}
                ·{' '}
                <Link href="/about" className="text-accent transition-colors hover:text-accent-strong">
                  关于我
                </Link>
              </p>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
}
