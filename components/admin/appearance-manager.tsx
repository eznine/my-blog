'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import {
  appearanceCssFrom,
  DEFAULT_APPEARANCE,
  THEME_DEFAULTS,
  type AppearanceConfig,
  type ThemeColors,
} from '@/lib/appearance';

type ThemeKey = 'dark' | 'light';

const SIZE_FIELDS: { key: keyof AppearanceConfig['sizes']; label: string; hint: string; min: number; max: number; step: number }[] = [
  { key: 'body', label: '正文', hint: '文章与页面正文', min: 14, max: 20, step: 0.5 },
  { key: 'listTitle', label: '列表标题', hint: '笔记/研究/项目列表条目标题', min: 15, max: 24, step: 0.5 },
  { key: 'listSummary', label: '列表摘要', hint: '列表条目摘要行', min: 12, max: 18, step: 0.5 },
  { key: 'pageTitle', label: '页面大标题', hint: '各列表页顶部大标题', min: 30, max: 60, step: 1 },
  { key: 'nav', label: '导航栏', hint: '顶部导航菜单文字', min: 13, max: 18, step: 0.5 },
];

const COLOR_FIELDS: { key: keyof ThemeColors; label: string; hint: string }[] = [
  { key: 'ink', label: '正文主色', hint: '标题、正文等主要文字' },
  { key: 'inkSoft', label: '次级文字', hint: '摘要、日期、说明文字' },
  { key: 'inkFaint', label: '弱化文字', hint: '注记、mono 小标签' },
  { key: 'accent', label: '强调色', hint: '按钮、高亮、红色标记' },
];

const inputCls =
  'w-24 rounded-lg border border-line bg-panel px-3 py-1.5 text-[14px] text-ink focus:border-accent/60 focus:outline-none';
const labelCls = 'mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase';

function clone(cfg: AppearanceConfig): AppearanceConfig {
  return JSON.parse(JSON.stringify(cfg));
}

export function AppearanceManager({ onBack }: { onBack: () => void }) {
  const [cfg, setCfg] = useState<AppearanceConfig>(DEFAULT_APPEARANCE);
  const [theme, setTheme] = useState<ThemeKey>('dark');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<AppearanceConfig>('/api/appearance')
      .then((r) =>
        setCfg({
          sizes: { ...DEFAULT_APPEARANCE.sizes, ...r.sizes },
          colors: {
            dark: { ...DEFAULT_APPEARANCE.colors.dark, ...r.colors?.dark },
            light: { ...DEFAULT_APPEARANCE.colors.light, ...r.colors?.light },
          },
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  // 实时预览：把当前编辑态注入页面（与 layout 注入的样式同源同优先级，后加载者生效）
  useEffect(() => {
    const id = 'ez-appearance-preview';
    let el = document.getElementById(id) as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement('style');
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = appearanceCssFrom(cfg);
    return () => {
      el?.remove();
    };
  }, [cfg]);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api('/api/appearance', { method: 'PUT', body: JSON.stringify(cfg) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const setSize = (key: keyof AppearanceConfig['sizes'], v: number) =>
    setCfg((c) => ({ ...c, sizes: { ...c.sizes, [key]: v } }));

  const setColor = (key: keyof ThemeColors, v: string) =>
    setCfg((c) => ({ ...c, colors: { ...c.colors, [theme]: { ...c.colors[theme], [key]: v } } }));

  const colorValue = (key: keyof ThemeColors): string =>
    cfg.colors[theme][key] || THEME_DEFAULTS[theme][key];

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            ADMIN · 外观设置
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">外观设置</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
            调整全站字号与文字颜色，本页即时预览。保存后写入 content/appearance.json：本地开发热更新生效，线上下次部署构建生效。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2.5 text-[15px] text-ink-soft transition-colors hover:text-accent">
            ← 返回列表
          </button>
          <button
            onClick={() => setCfg(clone(DEFAULT_APPEARANCE))}
            className="rounded-xl border border-line px-4 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
          >
            恢复默认
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <span style={{ textShadow: 'none' }}>{saving ? '保存中…' : '保存'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-3.5 text-[14px] text-accent">{error}</div>
      )}
      {saved && (
        <div className="mt-6 rounded-xl border border-line bg-panel px-5 py-3.5 font-mono text-[13px] text-ink-soft">
          已保存 ✓ （刷新前台页面即可看到）
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-ink-faint">加载中…</p>
      ) : (
        <>
          {/* ============ 字号 ============ */}
          <section className="mt-10 rounded-2xl border border-line bg-panel p-6 md:p-8">
            <h2 className="text-xl font-bold text-ink">字号</h2>
            <p className="mt-1.5 text-[13px] text-ink-faint">单位 px，拖动滑块或直接输入数值。</p>
            <div className="mt-6 space-y-6">
              {SIZE_FIELDS.map((f) => (
                <div key={f.key} className="flex flex-wrap items-center gap-4">
                  <div className="w-44 shrink-0">
                    <div className="text-[15px] font-medium text-ink">{f.label}</div>
                    <div className="mt-0.5 text-[12px] text-ink-faint">{f.hint}</div>
                  </div>
                  <input
                    type="range"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={cfg.sizes[f.key]}
                    onChange={(e) => setSize(f.key, Number(e.target.value))}
                    className="h-2.5 min-w-40 flex-1 cursor-pointer"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <input
                    type="number"
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={cfg.sizes[f.key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v > 0) setSize(f.key, v);
                    }}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            {/* 字号实时预览 */}
            <div className="mt-8 rounded-xl border border-line bg-bg/40 p-5 md:p-6">
              <div className="mono-label mb-4">预览 · PREVIEW</div>
              <div className="font-black tracking-tight text-ink" style={{ fontSize: 'var(--fs-page-title)' }}>
                页面大标题
              </div>
              <div className="mt-4 space-y-3 border-t border-line pt-4">
                <div className="font-semibold text-ink" style={{ fontSize: 'var(--fs-list-title)' }}>
                  列表标题：生态安全格局分析笔记
                </div>
                <div className="text-ink-soft" style={{ fontSize: 'var(--fs-list-summary)' }}>
                  列表摘要：基于 MSPA 与电路理论识别生态源地与廊道……
                </div>
                <div className="text-ink" style={{ fontSize: 'var(--fs-body)', lineHeight: 1.9 }}>
                  正文：地理信息科学方向研究生，关注生态安全格局、InSAR 形变监测与 WebGIS 可视化。
                </div>
                <div className="pt-1" style={{ fontSize: 'var(--fs-nav)' }}>
                  <span className="text-ink-soft">导航菜单</span>
                  <span className="ml-3 text-accent">当前页面</span>
                  <span className="ml-3 text-ink-faint">其他</span>
                </div>
              </div>
            </div>
          </section>

          {/* ============ 颜色 ============ */}
          <section className="mt-8 rounded-2xl border border-line bg-panel p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink">文字颜色</h2>
                <p className="mt-1.5 text-[13px] text-ink-faint">
                  不勾选自定义即用主题默认色；输入格式 #RRGGBB。
                </p>
              </div>
              <div className="flex gap-2">
                {(['dark', 'light'] as ThemeKey[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`rounded-lg px-4 py-2 text-[14px] font-medium transition-colors ${
                      theme === t ? 'text-white' : 'border border-line text-ink-soft hover:text-ink'
                    }`}
                    style={theme === t ? { background: 'var(--accent)' } : undefined}
                  >
                    {t === 'dark' ? '深色主题' : '浅色主题'}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 space-y-5">
              {COLOR_FIELDS.map((f) => {
                const custom = cfg.colors[theme][f.key];
                return (
                  <div key={f.key} className="flex flex-wrap items-center gap-4">
                    <div className="w-44 shrink-0">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="h-6 w-6 shrink-0 rounded-md border border-line-strong"
                          style={{ background: colorValue(f.key) }}
                        />
                        <span className="text-[15px] font-medium text-ink">{f.label}</span>
                      </div>
                      <div className="mt-0.5 text-[12px] text-ink-faint">{f.hint}</div>
                    </div>
                    <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={!!custom}
                        onChange={(e) => setColor(f.key, e.target.checked ? THEME_DEFAULTS[theme][f.key] : '')}
                        className="h-4 w-4 accent-[var(--accent)]"
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      自定义
                    </label>
                    <input
                      type="color"
                      value={colorValue(f.key)}
                      onChange={(e) => setColor(f.key, e.target.value)}
                      disabled={!custom}
                      className="h-9 w-14 cursor-pointer rounded-lg border border-line bg-transparent disabled:cursor-not-allowed disabled:opacity-40"
                    />
                    <input
                      type="text"
                      value={custom}
                      onChange={(e) => setColor(f.key, e.target.value)}
                      disabled={!custom}
                      placeholder={THEME_DEFAULTS[theme][f.key]}
                      className={`${inputCls} w-36 font-mono disabled:opacity-40`}
                      maxLength={7}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
