import type { Metadata } from 'next';
import { site } from '@/lib/site';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';

export const metadata: Metadata = {
  title: site.pages.about.title.replace('{name}', site.name),
  description: `${site.name} · ${site.identity} · ${site.affiliation}`,
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-10 md:pt-14">
      <Reveal>
        <PageHeader code={site.pages.about.code} en={site.pages.about.en} title={site.pages.about.title.replace('{name}', site.name)}>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-soft">
            <span>{site.identity}</span>
            <span className="text-ink-faint">/</span>
            <span>{site.affiliation}</span>
            <span className="text-ink-faint">/</span>
            <span className="font-mono text-[12px] tracking-wider">{site.coords}</span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a href={site.github} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-2">
              GitHub ↗
            </a>
            <a href={`mailto:${site.email}`} className="text-accent hover:text-accent-2">
              {site.email}
            </a>
          </div>
        </PageHeader>
      </Reveal>

      <Reveal>
        <div className="mt-10 md-body page-enter">
          <p className="text-[17px] leading-relaxed">{site.story.intro}</p>

          {site.story.sections.map((section) => (
            <section key={section.title} className="mt-10">
              <h2 className="mb-4 text-[22px] font-bold text-ink">{section.title}</h2>

              {section.type === 'list' && (
                <ul className="space-y-3">
                  {section.items?.map((item) => (
                    <li key={item.label} className="text-[16px] leading-relaxed text-ink">
                      <span className="font-semibold text-ink">{item.label}</span>
                      <span className="text-ink-soft">：{item.desc}</span>
                    </li>
                  ))}
                </ul>
              )}

              {section.type === 'text' && (
                <p className="text-[16px] leading-relaxed text-ink">{section.text}</p>
              )}

              {section.type === 'links' && (
                <ul className="space-y-3">
                  {section.links?.map((link) => (
                    <li key={link.label} className="text-[16px] leading-relaxed">
                      <a href={link.href} target="_blank" rel="noreferrer" className="text-accent hover:text-accent-2">
                        {link.label}
                      </a>
                      {link.text && <span className="text-ink-soft">：{link.text}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          {site.story.quote && (
            <blockquote className="mt-12 border-l-4 border-accent pl-5 text-[17px] italic text-ink-soft">
              {site.story.quote}
            </blockquote>
          )}
        </div>
      </Reveal>

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
        <section className="mt-12 border-t border-line pt-8">
          <div className="mono-label">{site.pages.about.skills}</div>
          <div className="mt-5 space-y-5">
            {site.skills.map((g) => (
              <div key={g.group} className="flex flex-col gap-2 sm:flex-row sm:gap-6">
                <span className="w-32 shrink-0 text-[16px] font-semibold text-ink">{g.group}</span>
                <div className="flex flex-wrap gap-1.5">
                  {g.items.map((item) => (
                    <span key={item} className="rounded-sm border border-line px-2 py-[3px] font-mono text-[11px] text-ink-soft">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <footer className="mt-14 border-t border-line pt-6 text-center">
          <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
            {site.pages.about.footer.replace('{coords}', site.coords)}
          </p>
        </footer>
      </Reveal>
    </div>
  );
}