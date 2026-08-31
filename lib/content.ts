import fs from 'node:fs';
import path from 'node:path';
import { cache } from 'react';
import matter from 'gray-matter';
import { renderMarkdown } from './md';

export interface BasePost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  tags: string[];
  html: string;
}

export interface Note extends BasePost {}

export interface Research extends BasePost {
  status?: string;
  links?: { label: string; url: string }[];
}

export interface Project extends BasePost {
  tech?: string[];
  demo?: string;
  github?: string;
}

interface RawFrontmatter {
  title?: string;
  date?: string | Date;
  summary?: string;
  category?: string;
  tags?: string[];
  status?: string;
  links?: { label: string; url: string }[];
  tech?: string[];
  demo?: string;
  github?: string;
}

function normalizeDate(d: string | Date | undefined): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  return '1970-01-01';
}

async function loadDir<T extends BasePost>(
  dir: string,
  decorate: (fm: RawFrontmatter) => Partial<T>
): Promise<T[]> {
  const abs = path.join(process.cwd(), 'content', dir);
  if (!fs.existsSync(abs)) return [];
  const files = fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .sort()
    .reverse();

  const posts = await Promise.all(
    files.map(async (file) => {
      const raw = fs.readFileSync(path.join(abs, file), 'utf-8');
      const { data, content } = matter(raw);
      const fm = data as RawFrontmatter;
      const html = await renderMarkdown(content);
      return {
        slug: file.replace(/\.mdx?$/, ''),
        title: fm.title ?? file.replace(/\.mdx?$/, ''),
        date: normalizeDate(fm.date),
        summary: fm.summary ?? '',
        category: fm.category ?? '',
        tags: fm.tags ?? [],
        html,
        ...decorate(fm),
      } as T;
    })
  );

  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

export const getNotes = cache(() => loadDir<Note>('notes', () => ({})));

export const getResearch = cache(() =>
  loadDir<Research>('research', (fm) => ({
    status: fm.status,
    links: fm.links,
  }))
);

export const getProjects = cache(() =>
  loadDir<Project>('projects', (fm) => ({
    tech: fm.tech,
    demo: fm.demo,
    github: fm.github,
  }))
);

export async function getNote(slug: string): Promise<Note | undefined> {
  return (await getNotes()).find((n) => n.slug === slug);
}

export async function getResearchPost(slug: string): Promise<Research | undefined> {
  return (await getResearch()).find((r) => r.slug === slug);
}

export async function getProject(slug: string): Promise<Project | undefined> {
  return (await getProjects()).find((p) => p.slug === slug);
}

export interface PageDoc {
  slug: string;
  title: string;
  html: string;
}

export const getPages = cache(async (): Promise<PageDoc[]> => {
  const abs = path.join(process.cwd(), 'content', 'pages');
  if (!fs.existsSync(abs)) return [];
  const files = fs.readdirSync(abs).filter((f) => f.endsWith('.md'));
  return Promise.all(
    files.map(async (file) => {
      const raw = fs.readFileSync(path.join(abs, file), 'utf-8');
      const { data, content } = matter(raw);
      return {
        slug: file.replace(/\.md$/, ''),
        title: (data.title as string) ?? file,
        html: await renderMarkdown(content),
      };
    })
  );
});

export async function getPage(slug: string): Promise<PageDoc | undefined> {
  return (await getPages()).find((p) => p.slug === slug);
}

export function formatDate(d: string): string {
  const [y, m, day] = d.split('-').map(Number);
  return `${y} 年 ${m} 月 ${day} 日`;
}

export function formatYearMonth(d: string): string {
  const [y, m] = d.split('-').map(Number);
  return `${y} 年 ${m} 月`;
}
