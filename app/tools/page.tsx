import type { Metadata } from 'next';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { DemDownloader } from '@/components/tools/dem-downloader';
import { FormatConverter } from '@/components/tools/format-converter';
import { site } from '@/lib/site-server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: site.pages.tools.page.title, description: site.pages.tools.page.desc };
}

// 动态模式：每次请求实时读取内容（文案改动无需构建即可看到）
export const dynamic = 'force-dynamic';

export default async function ToolsPage() {
  const tools = site.pages.tools;

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code={tools.page.code}
          en={tools.page.en}
          title={tools.page.title}
          desc={tools.page.desc}
        >
          <p className="mono-label mt-4">{tools.page.count}</p>
        </PageHeader>
      </Reveal>

      {/* 矢量格式转换（纯前端，随时可用） */}
      <div className="pt-8">
        <Reveal>
          <FormatConverter copy={tools.converter} />
        </Reveal>
      </div>

      {/* DEM 下载器（可用工具） */}
      <div className="pt-8">
        <Reveal>
          <DemDownloader copy={tools.dem} />
        </Reveal>
      </div>

      {/* 更多工具占位 */}
      <div className="pt-12">
        <Reveal>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live" />
            {tools.future.en}
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">{tools.future.title}</h2>
          <p className="mt-2 text-[15px] text-ink-soft">{tools.future.hint}</p>
        </Reveal>
        <div className="grid gap-4 pt-8 md:grid-cols-2">
          {tools.future.items.map((item, i) => (
            <Reveal key={item.name} delay={Math.min(i, 4) * 90}>
              <article className="explore-card relative flex h-full flex-col rounded-2xl p-7">
                <span className="corner" aria-hidden="true" />
                <div className="relative flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em]">
                  <span className="marker-dot !h-[5px] !w-[5px]" />
                  <span className="text-ink-faint">{item.status}</span>
                </div>
                <h3 className="relative mt-5 text-[1.3rem] font-bold leading-tight text-ink">{item.name}</h3>
                <p className="relative mt-3 text-[14.5px] leading-relaxed text-ink-soft">{item.desc}</p>
                <div className="relative mt-auto pt-5 text-[13px] text-ink-faint">敬请期待 · COMING SOON</div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </div>
  );
}
