import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import matter from 'gray-matter';
import { renderMarkdown, markdownToPlainText } from './md';

/* ---------------- 模块级 TTL 缓存（dynamic 模式专用） ----------------
 * 列表接口只解析 frontmatter（便宜）；正文 HTML 在打开文章页时才渲染，
 * 且按「文件 mtime + 3 秒 TTL」缓存。这样列表/首页/搜索的 SSR 开销极小，
 * 后台保存后最快 3 秒生效。
 */
const CONTENT_TTL = 3000;
const contentCache = new Map<string, { at: number; value: unknown; mtime?: number }>();

function ttl<T>(key: string, loader: () => Promise<T>): () => Promise<T> {
  return async () => {
    const hit = contentCache.get(key);
    if (hit && Date.now() - hit.at < CONTENT_TTL) return hit.value as T;
    const value = await loader();
    contentCache.set(key, { at: Date.now(), value });
    return value;
  };
}

function ttlSync<T>(key: string, loader: () => T): () => T {
  return () => {
    const hit = contentCache.get(key);
    if (hit && Date.now() - hit.at < CONTENT_TTL) return hit.value as T;
    const value = loader();
    contentCache.set(key, { at: Date.now(), value });
    return value;
  };
}

export interface BasePost {
  slug: string;
  title: string;
  date: string;
  summary: string;
  category: string;
  chapter?: string;
  tags: string[];
  /** 同一天内的手动排序（后台预览拖拽生成，小在前） */
  order?: number;
  /** 后台「隐藏」：前台列表与直接访问均不显示 */
  hidden?: boolean;
  html: string;
}

export interface Note extends BasePost {
  /** 演示地址（/demos/xxx/ 或外链）；有值则文章页标题右侧出现 DEMO 按钮 */
  demo?: string;
  /** 演示面板标题（默认取文章标题） */
  demoLabel?: string;
  /** 演示面板 iframe 高度（px，默认 440） */
  demoHeight?: number;
}

export interface Research extends BasePost {
  status?: string;
  /** 封面图（/uploads/xxx.jpg 或相对路径；后台「封面」字段可传/可填） */
  cover?: string;
  links?: { label: string; url: string }[];
}

export interface Project extends BasePost {
  tech?: string[];
  demo?: string;
  demoLabel?: string;
  demoHeight?: number;
  github?: string;
}

interface RawFrontmatter {
  title?: string;
  date?: string | Date;
  summary?: string;
  category?: string;
  chapter?: string;
  tags?: string[];
  status?: string;
  cover?: string;
  order?: number;
  hidden?: boolean;
  links?: { label: string; url: string }[];
  tech?: string[];
  demo?: string;
  demoLabel?: string;
  demoHeight?: number;
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

/** 一级子目录名推断大类：含中文原样保留（'WebGIS 开发'），纯 ASCII 做 Title Case（'02-web-basics' → 'Web Basics'） */
function folderCategory(dir: string): string | undefined {
  const name = dir.replace(/^\d+[-_\s]*/, '');
  if (!name) return undefined;
  if (/[^\x00-\x7F]/.test(name)) return name;
  const label = name
    .split(/[-_]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
  return label || undefined;
}

/** 二级子目录名推断章节：去前导编号后原样（'01-环境配置' → '环境配置'，'02web基础' → 'web基础'） */
function folderChapter(dir: string): string | undefined {
  const name = dir.replace(/^\d+[-_\s]*/, '');
  return name || undefined;
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

/* ---------------- 相对图片路径重写 ---------------- */
// md 里的相对路径图片（如 ../images/foo.png）在网页上会断链；
// 渲染前把图片复制到 public/content-images/，并把路径改写为绝对 URL。

const IMG_DIR_NAME = 'content-images';
const base = process.env.NEXT_PUBLIC_BASE_PATH || '';

function resolveImageSrc(url: string, mdFileDir: string): string | null {
  // URL 解码 + 剥离 ?query / #hash（Notion 导出常带 ?width=）
  const decoded = decodeURIComponent(url).split(/[?#]/)[0].trim();
  if (!decoded) return null;
  // 从 md 所在目录逐级向上找图片——文章被后台移入「大类/章节」子目录后，
  // images/ 往往还留在原处，只按 md 同级目录解析会断链。
  const contentRoot = path.join(process.cwd(), 'content');
  let dir = mdFileDir;
  for (;;) {
    const candidate = path.resolve(dir, decoded);
    if (fs.existsSync(candidate)) return candidate;
    if (dir === contentRoot) break;
    dir = path.dirname(dir);
  }
  return null;
}

function copyImageAndRewrite(url: string, mdFileDir: string): string | null {
  // 跳过外链与 data URI；站内绝对路径（如 /uploads/）补 base 前缀
  if (/^(https?:|data:)/.test(url)) return null;
  if (url.startsWith('/')) return `${base}${url}`;
  const srcPath = resolveImageSrc(url, mdFileDir);
  if (!srcPath) return null;
  try {
    // 用【文件内容】哈希命名：构建期与运行期、任何 cwd 下结果一致，
    // 预渲染 HTML 引用的文件名与运行时复制出来的文件名永远对得上。
    const data = fs.readFileSync(srcPath);
    const hash = crypto.createHash('md5').update(data).digest('hex').slice(0, 12);
    const ext = path.extname(srcPath) || '.png';
    const name = `${hash}${ext}`;
    const destDir = path.join(process.cwd(), 'public', IMG_DIR_NAME);
    const destPath = path.join(destDir, name);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(destPath)) fs.copyFileSync(srcPath, destPath);
    return `${base}/${IMG_DIR_NAME}/${name}`;
  } catch (e) {
    console.error('[content-images] 复制失败:', srcPath, e);
    return null;
  }
}

function rewriteImagePaths(md: string, mdFileDir: string): string {
  // Markdown 图片：![alt](url)
  md = md.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, url) => {
    const newUrl = copyImageAndRewrite(url, mdFileDir);
    return newUrl ? `![${alt}](${newUrl})` : match;
  });
  // HTML <img src="url">
  md = md.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/g, (match, pre, url, post) => {
    const newUrl = copyImageAndRewrite(url, mdFileDir);
    return newUrl ? `<img ${pre}src="${newUrl}"${post}>` : match;
  });
  return md;
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

/** 文章源文件索引：`${dir}:${slug}` → md 绝对路径（懒渲染用） */
const srcFileIndex = new Map<string, string>();
/** 文章正文纯文本：`${dir}:${slug}` → 搜索索引用（不走 markdown 渲染） */
const bodyTextIndex = new Map<string, string>();

async function loadDir<T extends BasePost>(
  dir: string,
  decorate: (fm: RawFrontmatter, ctx: { absFile: string }) => Partial<T>
): Promise<T[]> {
  const abs = path.join(process.cwd(), 'content', dir);
  if (!fs.existsSync(abs)) return [];
  const files = collectMarkdownFiles(abs);
  const taken = new Set<string>();

  const posts = files.map((relPath) => {
    const absFile = path.join(abs, relPath);
    const raw = fs.readFileSync(absFile, 'utf-8');
    const { data, content } = matter(raw);
    const fm = data as RawFrontmatter;

    const segments = relPath.split('/');
    const depth = segments.length - 1; // 目录层级：0=根，1=大类目录，2=大类/章节目录
    const folder = depth >= 1 ? segments[0] : undefined;
    const subFolder = depth >= 2 ? segments[1] : undefined;
    const fileName = segments[segments.length - 1];
    const date = normalizeDate(fm.date) || fileDate(absFile);
    const title = fm.title ?? inferTitle(content, fileName.replace(/\.mdx?$/, ''));
    const slug = uniqueSlug(slugify(relPath), taken);

    srcFileIndex.set(`${dir}:${slug}`, absFile);
    bodyTextIndex.set(`${dir}:${slug}`, markdownToPlainText(content));

    return {
      slug,
      title,
      date,
      summary: fm.summary ?? '',
      category: fm.category ?? (folder ? folderCategory(folder) ?? '未分类' : '未分类'),
      chapter: fm.chapter ?? (subFolder ? folderChapter(subFolder) : undefined),
      tags: fm.tags ?? [],
      order: fm.order !== undefined ? Number(fm.order) || 0 : undefined,
      hidden: fm.hidden === true || String(fm.hidden).toLowerCase() === 'true' || undefined,
      html: '', // 列表不带正文：SSR 快、RSC 载荷小；文章页用 getXxxFull() 懒渲染
      ...decorate(fm, { absFile }),
    } as T;
  });

  return posts
    .filter((p) => !(p.hidden === true || String(p.hidden).toLowerCase() === 'true'))
    .sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'zh'));
}

/** 渲染单篇文章正文（图片重写 + markdown），按「文件 mtime + 3s TTL」缓存 */
async function renderPostHtml(absFile: string): Promise<string> {
  let mtime = 0;
  try {
    mtime = fs.statSync(absFile).mtimeMs;
  } catch {}
  const key = `html:${absFile}`;
  const hit = contentCache.get(key);
  if (hit && hit.mtime === mtime && Date.now() - hit.at < CONTENT_TTL) return hit.value as string;
  const raw = fs.readFileSync(absFile, 'utf-8');
  const { content } = matter(raw);
  const md = rewriteImagePaths(content, path.dirname(absFile));
  const html = await renderMarkdown(md);
  contentCache.set(key, { at: Date.now(), value: html, mtime });
  return html;
}

async function withHtml<T extends BasePost>(
  dir: string,
  list: () => Promise<T[]>,
  slug: string
): Promise<T | undefined> {
  const meta = (await list()).find((p) => p.slug === slug);
  if (!meta) return undefined;
  const src = srcFileIndex.get(`${dir}:${slug}`);
  if (!src) return meta;
  return { ...meta, html: await renderPostHtml(src) };
}

/** 搜索索引用的正文纯文本（需先调用过对应的 getXxx 列表） */
export function getPostText(dir: 'notes' | 'research' | 'projects', slug: string): string {
  return bodyTextIndex.get(`${dir}:${slug}`) ?? '';
}

export const getNotes = ttl('notes', () =>
  loadDir<Note>('notes', (fm) => ({
    demo: fm.demo,
    demoLabel: fm.demoLabel,
    demoHeight: fm.demoHeight !== undefined ? Number(fm.demoHeight) || undefined : undefined,
  }))
);

export const getResearch = ttl('research', () =>
  loadDir<Research>('research', (fm, { absFile }) => ({
    status: fm.status,
    cover: fm.cover
      ? copyImageAndRewrite(String(fm.cover), path.dirname(absFile)) || String(fm.cover)
      : undefined,
    links: fm.links,
  }))
);

export const getProjects = ttl('projects', () =>
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

/** 文章详情（元信息 + 渲染后的正文 HTML），文章页专用 */
export async function getNoteFull(slug: string): Promise<Note | undefined> {
  return withHtml('notes', getNotes, slug);
}

export async function getResearchFull(slug: string): Promise<Research | undefined> {
  return withHtml('research', getResearch, slug);
}

export async function getProjectFull(slug: string): Promise<Project | undefined> {
  return withHtml('projects', getProjects, slug);
}

export interface PageDoc {
  slug: string;
  title: string;
  html: string;
}

export const getPages = ttl('pages', async (): Promise<PageDoc[]> => {
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
