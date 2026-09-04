import type { Metadata } from 'next';
import { site } from '@/lib/site-server';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: site.pages.about.title.replace('{name}', site.name),
    description: `${site.name} · ${site.identity} · ${site.affiliation}`,
  };
}

// 动态模式：每次请求实时读取内容
export const dynamic = 'force-dynamic';

export default async function AboutPage() {
  const essay = site.essay;
  const lastChapter = essay.chapters[essay.chapters.length - 1];
  // 末章最后两个短句作为「强调收束」，其余按普通段落渲染
  const tailIdx = Math.max(0, lastChapter.paragraphs.length - 2);

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-10 md:pt-14">
      <Reveal>
        <PageHeader code={site.pages.about.code} en={site.pages.about.en} title={site.pages.about.title.replace('{name}', site.name)}>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href={site.pages.about.github} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-2">
              GitHub ↗
            </a>
            <a href={`mailto:${site.pages.about.email}`} className="text-accent hover:text-accent-2">
              {site.pages.about.email}
            </a>
          </div>
        </PageHeader>
      </Reveal>

      {/* ==================== 散文 ==================== */}
      <div className="mt-12 page-enter">
        {/* 开篇引语：大字 + 光效 + 坐标注记 */}
        <Reveal variant="blur">
          <p className="grad-text glow-text text-[26px] font-black leading-snug tracking-tight md:text-[32px]">
            {essay.epigraph}
          </p>
          <p className="mono-label mt-4 !text-accent">37.74°N · 112.66°E · STARTING POINT</p>
        </Reveal>

        {/* 章节 */}
        {essay.chapters.map((ch, ci) => {
          const isTail = ci === essay.chapters.length - 1;
          return (
            <section key={ch.code} className="mt-14">
              <Reveal variant="left">
                <div className="mono-label flex items-center gap-3 !text-accent">
                  <span className="marker-dot is-live" />
                  {ch.code}
                </div>
                <h2 className="mt-2 text-[20px] font-bold text-ink">{ch.title}</h2>
              </Reveal>
              <div className="mt-5 space-y-5">
                {ch.paragraphs.map((para, pi) => {
                  const isEmphasis = isTail && pi >= tailIdx;
                  if (isEmphasis) {
                    return (
                      <Reveal key={pi} variant="up" delay={(pi - tailIdx) * 130}>
                        <p
                          className="grad-text glow-text text-[24px] leading-snug font-black tracking-tight md:text-[28px]"
                          style={{ textShadow: 'none' }}
                        >
                          {para}
                        </p>
                      </Reveal>
                    );
                  }
                  return (
                    <Reveal key={pi} variant="up" delay={Math.min(pi, 3) * 90}>
                      <p className="text-[16px] leading-[1.9] text-ink">{para}</p>
                    </Reveal>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* 收束注记 */}
        <Reveal variant="blur">
          <div className="mt-14 border-t border-line pt-6 text-center">
            <p className="font-mono text-[11px] tracking-[0.22em] text-ink-faint uppercase">NEVER END · 未完待续</p>
          </div>
        </Reveal>
      </div>

      <Reveal>
        <section className="mt-14 border-t border-line pt-8">
          <div className="mono-label">{site.pages.about.education}</div>
          <ul className="mt-4 space-y-4">
            {site.education.map((e) => (
              <li key={e.period} className="flex flex-col gap-0.5 sm:flex-row sm:gap-6">
                <span className="w-32 shrink-0 font-mono text-[12px] text-ink-faint">{e.period}</span>
                <div>
                  <div className="text-[17px] font-semibold text-ink">{e.school}</div>
                  <div className="text-[15px] text-ink-soft">{e.detail}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <section className="mt-12 border-t border-line pt-8">
          <div className="mono-label">{site.pages.about.interests}</div>
          <ul className="mt-4 space-y-2">
            {site.researchInterests.map((r) => (
              <li key={r} className="flex items-baseline gap-3 text-[17px] text-ink">
                <span className="font-mono text-sm text-accent">▸</span>
                {r}
              </li>
            ))}
          </ul>
        </section>
      </Reveal>

      <Reveal>
        <footer className="mt-16 border-t border-line pt-8 text-center">
          <p className="mono-label !text-ink-faint">{site.pages.about.footer.replace('{coords}', site.pages.about.coords)}</p>
        </footer>
      </Reveal>
    </div>
  );
}
