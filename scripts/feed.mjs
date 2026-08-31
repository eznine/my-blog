import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'copy', '00-站点信息.json'), 'utf-8'));
const SITE_URL = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '') + BASE_PATH;

/** 与 lib/content.ts 的 slugify 保持一致：URL 安全的 ASCII slug */
function slugify(input) {
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

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'out']);

function collectMd(abs, rel = '') {
  const out = [];
  let entries;
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
      out.push(...collectMd(path.join(abs, e.name), relPath));
    } else if (e.name.endsWith('.md') || e.name.endsWith('.mdx')) out.push(relPath);
  }
  return out.sort();
}

function readDir(dir) {
  const abs = path.join(ROOT, 'content', dir);
  if (!fs.existsSync(abs)) return [];
  return collectMd(abs)
    .map((relPath) => {
      const raw = fs.readFileSync(path.join(abs, relPath), 'utf-8');
      const { data, content } = matter(raw);
      const stat = fs.statSync(path.join(abs, relPath));
      const dateStr =
        data.date instanceof Date
          ? data.date.toISOString().slice(0, 10)
          : String(data.date || stat.mtime.toISOString().slice(0, 10)).slice(0, 10);
      const date = new Date(dateStr).toISOString();
      const titleMatch = content.match(/^#\s+(.+)$/m);
      return {
        slug: slugify(relPath),
        title: data.title ?? titleMatch?.[1]?.trim() ?? relPath,
        summary: data.summary ?? '',
        date,
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

const sections = [
  { dir: 'notes', prefix: '/notes/' },
  { dir: 'research', prefix: '/research/' },
  { dir: 'projects', prefix: '/projects/' },
];

const items = sections.flatMap((s) =>
  readDir(s.dir).map((it) => ({ ...it, url: `${SITE_URL}${s.prefix}${it.slug}/` }))
);

function esc(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

const pubDate = new Date().toUTCString();
const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(cfg.siteName)} · ${esc(cfg.name)}</title>
    <link>${SITE_URL}/</link>
    <description>${esc(cfg.bio)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${pubDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
${items
  .slice(0, 30)
  .map(
    (it) => `    <item>
      <title>${esc(it.title)}</title>
      <link>${it.url}</link>
      <guid isPermaLink="true">${it.url}</guid>
      <pubDate>${new Date(it.date).toUTCString()}</pubDate>
      <description>${esc(it.summary)}</description>
    </item>`
  )
  .join('\n')}
  </channel>
</rss>
`;

const staticPages = ['', '/notes/', '/research/', '/projects/', '/archive/', '/about/', '/search/'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticPages.map((p) => ({ url: `${SITE_URL}${p}`, date: pubDate })), ...items.map((it) => ({ url: it.url, date: new Date(it.date).toUTCString() }))]
  .map((p) => `  <url>
    <loc>${p.url}</loc>
    <lastmod>${p.date}</lastmod>
  </url>`)
  .join('\n')}
</urlset>
`;

fs.mkdirSync(path.join(ROOT, 'public'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'public', 'feed.xml'), feed);
fs.writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), sitemap);
console.log(`feed.xml: ${Math.min(items.length, 30)} items · sitemap.xml: ${items.length + staticPages.length} urls`);
