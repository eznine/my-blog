import cfg from '../site.config.json';

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
}

export const site = cfg as SiteConfig;

export const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function asset(path: string): string {
  return `${basePath}${path}`;
}
