import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const ROOT = process.cwd();
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf-8'));
const SITE_URL = (process.env.SITE_URL || cfg.siteUrl).replace(/\/$/, '') + BASE_PATH;

function readDir(dir) {
  const abs = path.join(ROOT, 'content', dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(abs, file), 'utf-8');
      const { data } = matter(raw);
      const date =
        data.date instanceof Date
          ? data.date.toISOString()
          : new Date(data.date || '1970-01-01').toISOString();
      return {
        slug: file.replace(/\.md$/, ''),
        title: data.title ?? file,
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
