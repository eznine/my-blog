import type { Metadata } from 'next';
import { buildSearchIndex } from '@/lib/search';
import { SearchClient } from '@/components/search-client';
import { PageHeader } from '@/components/page-header';
import { site } from '@/lib/site-server';

export async function generateMetadata(): Promise<Metadata> {
  return { title: site.pages.search.title, description: site.pages.search.desc };
}

// 动态模式：每次请求实时生成搜索索引
export const dynamic = 'force-dynamic';

export default async function SearchPage() {
  const items = await buildSearchIndex();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-10 md:pt-14">
      <PageHeader
        code={site.pages.search.code}
        en={site.pages.search.en}
        title={site.pages.search.title}
        desc={site.pages.search.desc}
      />
      <div className="mt-8">
        <SearchClient items={items} />
      </div>
    </div>
  );
}
