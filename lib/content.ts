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

/**
 * 生成 URL 安全的 ASCII slug。
 * 背景：output:'export' 开发模式下 Next 用百分号编码后的路径段与
 * generateStaticParams 的参数比对，非 ASCII slug（中文文件名）会 404。
 * 规则：小写 → 非 [a-z0-9] 连缀折叠为 '-' → 去首尾 '-'；全空回退 'post'。
 */
export function slugify(input: string): string {
  const s = input
    .replace(/\.mdx?$/, '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)
    .replace(/-+$/g, '');
  return s || 'post';
}

function uniqueSlug(base: string, taken: Set<string>): string {
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  for (let i = 2; ; i++) {
    const s = `${base}-${i}`;
    if (!taken.has(s)) {
      taken.add(s);
      return s;
    }
  }
}

/** 子目录名推断分类：'02-web-basics' → 'Web Basics' */
function folderCategory(dir: string): string | undefined {
  const label = dir
    .replace(/^\d+[-_\s]*/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return label || undefined;
}

/** 递归收集目录下所有 .md/.mdx 文件，返回相对路径（正斜杠分隔）。跳过 node_modules 等非内容目录。 */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'out']);

function collectMarkdownFiles(abs: string, rel = ''): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(abs, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.name.startsWith('.')) continue;
    const relPath = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...collectMarkdownFiles(path.join(abs, e.name), relPath));
    } else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) {
      out.push(relPath);
    }
  }
  return out.sort();
}

/** 无 frontmatter 时从正文第一个 # 标题推断标题 */
function inferTitle(content: string, fallback: string): string {
  const m = content.match(/^#\s+(.+)$/m);
  if (m) return m[1].trim().slice(0, 80);
  return fallback;
}

/** 无 frontmatter 日期时用文件修改时间 */
function fileDate(absFile: string): string {
  try {
    return fs.statSync(absFile).mtime.toISOString().slice(0, 10);
  } catch {
    return '1970-01-01';
  }
}

function normalizeDate(d: string | Date | undefined): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  if (typeof d === 'string') return d.slice(0, 10);
  return '';
}

async function loadDir<T extends BasePost>(
  dir: string,
  decorate: (fm: RawFrontmatter) => Partial<T>
): Promise<T[]> {
  const abs = path.join(process.cwd(), 'content', dir);
  if (!fs.existsSync(abs)) return [];
  const files = collectMarkdownFiles(abs);
  const taken = new Set<string>();

  const posts = await Promise.all(
    files.map(async (relPath) => {
      const absFile = path.join(abs, relPath);
      const raw = fs.readFileSync(absFile, 'utf-8');
      const { data, content } = matter(raw);
      const fm = data as RawFrontmatter;
      const html = await renderMarkdown(content);

      const segments = relPath.split('/');
      const folder = segments.length > 1 ? segments[0] : undefined;
      const fileName = segments[segments.length - 1];
      const date = normalizeDate(fm.date) || fileDate(absFile);
      const title = fm.title ?? inferTitle(content, fileName.replace(/\.mdx?$/, ''));

      return {
        slug: uniqueSlug(slugify(relPath), taken),
        title,
        date,
        summary: fm.summary ?? '',
        category: fm.category ?? (folder ? folderCategory(folder) ?? '未分类' : '未分类'),
        tags: fm.tags ?? [],
        html,
        ...decorate(fm),
      } as T;
    })
  );

  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh'));
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
        slug: slugify(file),
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
