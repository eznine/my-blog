import type { Metadata } from 'next';
import { getResearch } from '@/lib/content';
import { PageHeader } from '@/components/page-header';
import { Reveal } from '@/components/reveal';
import { ResearchItem } from '@/components/research-item';

export const metadata: Metadata = {
  title: '研究',
  description: '真正参与的科研工作：生态安全格局、生态网络、InSAR 形变监测、XGBoost-SHAP 等。',
};

export default async function ResearchPage() {
  const research = await getResearch();

  return (
    <div className="mx-auto max-w-6xl px-6 pb-12 pt-10 md:pt-16">
      <Reveal>
        <PageHeader
          code="02"
          en="RESEARCH"
          title="研究"
          desc="真正参与的科研工作——与学习笔记区分开。每项研究记录背景、数据、方法、实验与成果。"
        >
          <p className="mono-label mt-4">共 {research.length} 项 · 生态安全格局 / InSAR / 机器学习</p>
        </PageHeader>
      </Reveal>
      <div className="pt-4">
        {research.length === 0 ? (
          <p className="py-12 text-sm text-ink-faint">还没有研究记录，去 content/research/ 添加。</p>
        ) : (
          research.map((r, i) => (
            <Reveal key={r.slug} delay={Math.min(i, 4) * 70}>
              <ResearchItem research={r} />
            </Reveal>
          ))
        )}
      </div>
    </div>
  );
}
