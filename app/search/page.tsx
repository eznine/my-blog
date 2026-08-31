import type { Metadata } from 'next';
import { buildSearchIndex } from '@/lib/search';
import { SearchClient } from '@/components/search-client';
import { PageHeader } from '@/components/page-header';

export const metadata: Metadata = {
  title: '搜索',
  description: '全文搜索所有笔记、研究与项目。',
};

export default async function SearchPage() {
  const items = await buildSearchIndex();

  return (
    <div className="mx-auto max-w-3xl px-5 pb-10 pt-10 md:pt-14">
      <PageHeader
        code="⌖"
        en="SEARCH"
        title="搜索"
        desc="在全部笔记、研究与项目中检索——标题、标签、分类与正文均可命中。"
      />
      <div className="mt-8">
        <SearchClient items={items} />
      </div>
    </div>
  );
}
