import cfg from '../content/appearance.json';

/**
 * 全站外观配置（content/appearance.json）。
 * sizes 控制各区域字号（覆盖 globals.css 的 --fs-* 默认值）；
 * colors 按主题覆盖文字/强调色，空字符串表示使用主题默认色。
 */

export interface ThemeColors {
  ink: string;
  inkSoft: string;
  inkFaint: string;
  accent: string;
}

export interface AppearanceConfig {
  sizes: {
    body: number;
    listTitle: number;
    listSummary: number;
    pageTitle: number;
    nav: number;
    filter: number;
  };
  colors: { dark: ThemeColors; light: ThemeColors };
}

export const DEFAULT_APPEARANCE: AppearanceConfig = {
  sizes: { body: 16, listTitle: 17.5, listSummary: 14.5, pageTitle: 44, nav: 15, filter: 13.5 },
  colors: {
    dark: { ink: '', inkSoft: '', inkFaint: '', accent: '' },
    light: { ink: '', inkSoft: '', inkFaint: '', accent: '' },
  },
};

/** 主题默认色（globals.css），空值时后台 UI 展示与拾色器回退用 */
export const THEME_DEFAULTS: Record<'dark' | 'light', ThemeColors> = {
  dark: { ink: '#ece5d1', inkSoft: '#a89e87', inkFaint: '#6e6552', accent: '#ff4b33' },
  light: { ink: '#1c1710', inkSoft: '#57503f', inkFaint: '#8d8471', accent: '#d3381c' },
};

export const appearance = cfg as AppearanceConfig;

const hexToRgba = (hex: string, alpha: number): string | null => {
  const m = hex.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

const px = (v: number | undefined, fallback: string): string =>
  typeof v === 'number' && v > 0 ? `${v}px` : fallback;

function themeCss(selector: string, c: Partial<ThemeColors> | undefined): string {
  const lines: string[] = [];
  if (c?.ink) lines.push(`--ink: ${c.ink};`);
  if (c?.inkSoft) lines.push(`--ink-soft: ${c.inkSoft};`);
  if (c?.inkFaint) lines.push(`--ink-faint: ${c.inkFaint};`);
  if (c?.accent) {
    const glow = hexToRgba(c.accent, 0.22);
    lines.push(`--accent: ${c.accent};`);
    lines.push(`--accent-strong: ${c.accent};`);
    if (glow) lines.push(`--accent-glow: ${glow};`);
  }
  if (!lines.length) return '';
  return `${selector}{${lines.join('')}}`;
}

/** 由任意配置生成覆盖 globals.css 变量的样式片段（layout 注入 / 后台实时预览共用） */
export function appearanceCssFrom(c: Partial<AppearanceConfig> | null | undefined): string {
  const sizes = c?.sizes || ({} as Partial<AppearanceConfig['sizes']>);
  const sizeCss = `:root{
--fs-body:${px(sizes.body, '16px')};
--fs-list-title:${px(sizes.listTitle, '17.5px')};
--fs-list-summary:${px(sizes.listSummary, '14.5px')};
--fs-page-title:${px(sizes.pageTitle, '44px')};
--fs-nav:${px(sizes.nav, '15px')};
--fs-filter:${px(sizes.filter, '13.5px')};}`;
  return [sizeCss, themeCss(':root', c?.colors?.light), themeCss('.dark', c?.colors?.dark)]
    .filter(Boolean)
    .join('\n');
}

/** 生成注入 layout 的样式片段（读取 content/appearance.json） */
export function buildAppearanceCss(): string {
  return appearanceCssFrom(appearance);
}
