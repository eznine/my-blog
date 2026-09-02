import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getResearch, formatDate } from '@/lib/content';
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
  const post = (await getResearch()).find((r) => r.slug === slug);
  if (!post) return {};
  return { title: post.title, description: post.summary };
}

export default async function ResearchPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = await getResearch();
  const post = posts.find((r) => r.slug === slug);
  if (!post) notFound();

  return (
    <ArticleShell
      kicker={`02 · RESEARCH / ${post.category}`}
      title={post.title}
      dateText={formatDate(post.date)}
      tags={post.tags}
      metaExtra={
        <>
          {post.status && (
            <span className="rounded-sm border border-accent px-2 py-[2px] font-mono text-[11px] tracking-widest text-accent">
              {post.status}
            </span>
          )}
          {post.links?.map((l) => (
            <a
              key={l.url}
              href={l.url}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:text-accent-strong"
            >
              {l.label} ↗
            </a>
          ))}
        </>
      }
      html={post.html}
      headings={extractHeadings(post.html)}
      backHref="/research"
      backLabel="返回研究列表"
    />
  );
}
