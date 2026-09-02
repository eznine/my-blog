import globalCfg from '../content/copy/00-站点信息.json';
import homeCfg from '../content/copy/01-首页.json';
import notesCfg from '../content/copy/02-笔记页.json';
import researchCfg from '../content/copy/03-研究页.json';
import projectsCfg from '../content/copy/04-项目页.json';
import archiveCfg from '../content/copy/05-归档页.json';
import aboutCfg from '../content/copy/06-关于页.json';
import searchCfg from '../content/copy/07-搜索页.json';
import notFoundCfg from '../content/copy/08-404页.json';
import toolsCfg from '../content/copy/09-工具页.json';

/**
 * 全站文案：content/copy/ 下按页面拆分（00-站点信息 → 08-404页）。
 * 本文件为「编译期静态版」，供 client 组件使用（导航/页脚/按钮文案，
 * 变化低频）。server 页面请用 lib/site-server.ts（动态版，改文案即见）。
 * 各文件里的 "_说明" 字段是给人看的注释，合并时丢弃。
 */

export interface FocusArea {
  code: string;
  title: string;
  desc: string;
}

export interface SkillGroup {
  group: string;
  items: string[];
}

export interface EducationItem {
  period: string;
  school: string;
  detail: string;
}

export interface StoryLink {
  label: string;
  href: string;
  text?: string;
}

export interface StorySection {
  title: string;
  type: 'list' | 'text' | 'links';
  items?: { label: string; desc: string }[];
  text?: string;
  links?: StoryLink[];
}

export interface SiteConfig {
  name: string;
  siteName: string;
  role: string;
  tagline: string;
  affiliation: string;
  identity: string;
  coords: string;
  email: string;
  github: string;
  siteUrl: string;
  bio: string;
  focusAreas: FocusArea[];
  skills: SkillGroup[];
  education: EducationItem[];
  researchInterests: string[];
  meta: { title: string; titleTemplate: string; description: string };
  nav: { href: string; label: string }[];
  navSearch: string;
  navMenu: string;
  footer: { github: string; copyright: string; sheet: string };
  hero: {
    badge: string;
    mapLabel: string;
    titleLines: string[];
    bio: string;
    ctaNotes: string;
    ctaProjects: string;
    github: string;
    stats: { label: string; href: string }[];
    scrollHint: string;
    scrollHintEn: string;
  };
  home: {
    sections: { code: string; en: string; title: string; href?: string; link?: string }[];
    emptyNotes: string;
    emptyResearch: string;
    emptyProjects: string;
    endnote: string;
    endnoteArchive: string;
    endnoteAbout: string;
  };
  pages: {
    notes: { code: string; en: string; title: string; desc: string; count: string };
    research: { code: string; en: string; title: string; desc: string; count: string; empty: string };
    projects: { code: string; en: string; title: string; desc: string; count: string; empty: string };
    archive: {
      code: string;
      en: string;
      title: string;
      desc: string;
      count: string;
      empty: string;
      typeNote: string;
      typeResearch: string;
      typeProject: string;
    };
    about: {
      code: string;
      en: string;
      title: string;
      identity: string;
      affiliation: string;
      coords: string;
      github: string;
      email: string;
      education: string;
      interests: string;
      skills: string;
      footer: string;
    };
    search: {
      code: string;
      en: string;
      title: string;
      desc: string;
      placeholder: string;
      all: string;
      empty: string;
      noMatch: string;
      indexLabel: string;
      noMatchLabel: string;
    };
    tools: {
      page: { code: string; en: string; title: string; desc: string; count: string };
      dem: {
        title: string;
        en: string;
        status: string;
        desc: string;
        open: string;
        hint: string;
        offline: string;
        checking: string;
        retry: string;
      };
      future: {
        title: string;
        en: string;
        hint: string;
        items: { name: string; desc: string; status: string }[];
      };
    };
  };
  story: { intro: string; sections: StorySection[]; quote: string };
  notesBrowser: {
    placeholder: string;
    cat: string;
    tag: string;
    chap: string;
    allChapters: string;
    sort: string;
    sortNewest: string;
    sortOldest: string;
    all: string;
    collapse: string;
    count: string;
    clear: string;
    empty: string;
    emptyLabel: string;
  };
  utilities: { glow: string; on: string; off: string; admin: string };
  notFound: { code: string; message: string; label: string; back: string };
}

/** 丢弃 "_开头" 的说明字段 */
const strip = (obj: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    out[k] = v;
  }
  return out;
};

const g = strip(globalCfg as unknown as Record<string, unknown>);
const h = strip(homeCfg as unknown as Record<string, unknown>);
const n = strip(notesCfg as unknown as Record<string, unknown>);
const r = strip(researchCfg as unknown as Record<string, unknown>);
const p = strip(projectsCfg as unknown as Record<string, unknown>);
const a = strip(archiveCfg as unknown as Record<string, unknown>);
const ab = strip(aboutCfg as unknown as Record<string, unknown>);
const se = strip(searchCfg as unknown as Record<string, unknown>);
const nf = strip(notFoundCfg as unknown as Record<string, unknown>);
const t = strip(toolsCfg as unknown as Record<string, unknown>);

export const site = {
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
    tools: t,
  },
  notesBrowser: n.browser,
  notFound: nf.notFound,
} as unknown as SiteConfig;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function asset(path: string): string {
  return `${basePath}${path}`;
}