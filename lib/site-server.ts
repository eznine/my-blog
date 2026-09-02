import fs from 'node:fs';
import path from 'node:path';
import type { SiteConfig } from './site';

/**
 * 全站文案「动态版」：server 页面专用（Server Components）。
 * 每次请求实时读取 content/copy/*.json + 3 秒 TTL 缓存，
 * 后台/手工改文案后最快 3 秒内前台生效，无需重启服务。
 * 用法与 lib/site.ts 完全一致（site.xxx），仅 server 侧可用。
 */

const COPY_DIR = path.join(process.cwd(), 'content', 'copy');
const COPY_FILES = [
  '00-站点信息.json',
  '01-首页.json',
  '02-笔记页.json',
  '03-研究页.json',
  '04-项目页.json',
  '05-归档页.json',
  '06-关于页.json',
  '07-搜索页.json',
  '08-404页.json',
];

/** 丢弃 "_开头" 的说明字段 */
const strip = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    out[k] = v;
  }
  return out;
};

function readCopy(name: string): Record<string, unknown> {
  try {
    return JSON.parse(fs.readFileSync(path.join(COPY_DIR, name), 'utf-8'));
  } catch {
    return {};
  }
}

function loadSite(): SiteConfig {
  const [g, h, n, r, p, a, ab, se, nf] = COPY_FILES.map((f) => strip(readCopy(f)));
  return {
    ...g,
    hero: h.hero,
    home: h.home,
    focusAreas: h.focusAreas,
    education: ab.education,
    researchInterests: ab.researchInterests,
    skills: ab.skills,
    story: ab.story,
    pages: {
      notes: n.page,
      research: r.page,
      projects: p.page,
      archive: a.page,
      about: ab.page,
      search: se.page,
    },
    notesBrowser: n.browser,
    notFound: nf.notFound,
  } as unknown as SiteConfig;
}

let _siteData: SiteConfig | null = null;
let _siteAt = 0;
const SITE_TTL = 3000;

export function getSite(): SiteConfig {
  const now = Date.now();
  if (!_siteData || now - _siteAt > SITE_TTL) {
    _siteData = loadSite();
    _siteAt = now;
  }
  return _siteData;
}

/** Proxy 惰性刷新：site.xxx 每次访问都检查 TTL，超时重读磁盘（同步语法不变） */
export const site = new Proxy({} as SiteConfig, {
  get: (_t, key) => (getSite() as unknown as Record<string, unknown>)[key as string],
}) as SiteConfig;