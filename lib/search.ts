import { getNotes, getResearch, getProjects, getPostText } from './content';
import type { SearchItem } from './search-core';

export type { SearchItem, SearchHit } from './search-core';

const BODY_LIMIT = 6000;

export async function buildSearchIndex(): Promise<SearchItem[]> {
  const [notes, research, projects] = await Promise.all([getNotes(), getResearch(), getProjects()]);

  return [
    ...notes.map<SearchItem>((n) => ({
      type: 'note',
      typeLabel: '笔记',
      title: n.title,
      url: `/notes/${n.slug}`,
      date: n.date,
      summary: n.summary,
      category: n.category,
      tags: n.tags,
      text: getPostText('notes', n.slug).slice(0, BODY_LIMIT),
    })),
    ...research.map<SearchItem>((r) => ({
      type: 'research',
      typeLabel: '研究',
      title: r.title,
      url: `/research/${r.slug}`,
      date: r.date,
      summary: r.summary,
      category: r.category,
      tags: r.tags,
      text: getPostText('research', r.slug).slice(0, BODY_LIMIT),
    })),
    ...projects.map<SearchItem>((p) => ({
      type: 'project',
      typeLabel: '项目',
      title: p.title,
      url: `/projects/${p.slug}`,
      date: p.date,
      summary: p.summary,
      category: p.category,
      tags: p.tags,
      text: getPostText('projects', p.slug).slice(0, BODY_LIMIT),
    })),
  ];
}
