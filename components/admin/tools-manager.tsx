'use client';

import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * 工具页设置：编辑 content/copy/09-工具页.json 的文案
 * （page 标题区 / converter / dem / gee / future 各区块介绍 + 首页勘测路线的工具点时间）。
 * GET/PUT /api/copy/tools；"_说明" 注释字段后台不展示、保存时保留。
 */

interface ToolsCopy {
  page: { code: string; en: string; title: string; desc: string; count: string };
  converter: Record<string, string>;
  dem: Record<string, string>;
  gee: Record<string, string>;
  future: { title: string; en: string; hint: string; items: { name: string; desc: string; status: string }[] };
  date: string;
}

const EMPTY: ToolsCopy = {
  page: { code: '09', en: 'TOOLS', title: '', desc: '', count: '' },
  converter: {},
  dem: {},
  gee: {},
  future: { title: '', en: '', hint: '', items: [] },
  date: '',
};

const inputCls =
  'w-full rounded-lg border border-line bg-panel px-3 py-2 text-[14px] text-ink transition-all focus:border-accent/60 focus:outline-none';
const labelCls = 'mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase';

/** 单行文本字段定义：区块 key → 字段 key → 中文标签 */
const SECTIONS: { key: 'page' | 'converter' | 'dem' | 'gee'; title: string; en: string; fields: { key: string; label: string; multi?: boolean }[] }[] = [
  {
    key: 'page',
    title: '页面标题区',
    en: 'PAGE HEADER',
    fields: [
      { key: 'code', label: '编号 CODE' },
      { key: 'en', label: '英文 EN' },
      { key: 'title', label: '标题' },
      { key: 'desc', label: '描述', multi: true },
      { key: 'count', label: '计数行', multi: true },
    ],
  },
  {
    key: 'converter',
    title: '矢量格式转换',
    en: 'FORMAT CONVERTER',
    fields: [
      { key: 'title', label: '标题' },
      { key: 'en', label: '英文 EN' },
      { key: 'desc', label: '介绍', multi: true },
      { key: 'importEn', label: '导入步骤标题' },
      { key: 'drop', label: '拖拽提示' },
      { key: 'browse', label: '选择按钮' },
      { key: 'importFormats', label: '支持格式说明', multi: true },
      { key: 'target', label: '导出步骤标题' },
      { key: 'convert', label: '转换按钮' },
      { key: 'reset', label: '重置按钮' },
      { key: 'download', label: '下载按钮' },
      { key: 'basemap', label: '底图' },
      { key: 'basemapAmap', label: '底图·高德' },
      { key: 'basemapEsri', label: '底图·Esri' },
      { key: 'gcjTip', label: 'GCJ-02 提示', multi: true },
    ],
  },
  {
    key: 'dem',
    title: 'DEM 下载器',
    en: 'DEM DOWNLOADER',
    fields: [
      { key: 'title', label: '标题' },
      { key: 'en', label: '英文 EN' },
      { key: 'status', label: '状态徽标' },
      { key: 'desc', label: '介绍', multi: true },
      { key: 'open', label: '新窗口按钮' },
      { key: 'hint', label: '使用提示', multi: true },
      { key: 'offline', label: '离线提示', multi: true },
      { key: 'checking', label: '检测中文字' },
      { key: 'retry', label: '重试按钮' },
    ],
  },
  {
    key: 'gee',
    title: 'GEE Playground',
    en: 'GEE PLAYGROUND',
    fields: [
      { key: 'title', label: '标题' },
      { key: 'en', label: '英文 EN' },
      { key: 'status', label: '状态徽标' },
      { key: 'desc', label: '介绍', multi: true },
      { key: 'open', label: '新窗口按钮' },
      { key: 'expand', label: '展开按钮' },
      { key: 'hint', label: '使用提示', multi: true },
    ],
  },
];

function clone(c: ToolsCopy): ToolsCopy {
  return JSON.parse(JSON.stringify(c));
}

export function ToolsManager({ onBack }: { onBack: () => void }) {
  const [cfg, setCfg] = useState<ToolsCopy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api<ToolsCopy>('/api/copy/tools')
      .then((r) =>
        setCfg({
          page: { ...EMPTY.page, ...r.page },
          converter: { ...EMPTY.converter, ...r.converter },
          dem: { ...EMPTY.dem, ...r.dem },
          gee: { ...EMPTY.gee, ...r.gee },
          future: {
            title: r.future?.title ?? '',
            en: r.future?.en ?? '',
            hint: r.future?.hint ?? '',
            items: Array.isArray(r.future?.items) ? r.future.items.map((i) => ({ ...i })) : [],
          },
          date: r.date ?? '',
        }),
      )
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api('/api/copy/tools', { method: 'PUT', body: JSON.stringify(cfg) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            ADMIN · 工具页设置
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">工具页文案</h1>
          <p className="mt-2 text-[14px] text-ink-soft">
            修改工具页各区块介绍与首页勘测路线上的工具点时间，保存后约 3 秒前台生效。
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="font-mono text-[13px] text-accent">已保存 ✓</span>}
          <button
            onClick={onBack}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
          >
            返回列表
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            <span style={{ textShadow: 'none' }}>{saving ? '保存中…' : '保存'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-3 text-[14px] text-accent">{error}</div>
      )}

      {loading ? (
        <p className="py-20 text-center text-ink-faint">加载中…</p>
      ) : (
        <div className="mt-8 space-y-6">
          {/* 工具点时间（首页勘测路线） */}
          <section className="rounded-2xl border border-line p-5">
            <div className="mono-label !text-accent">TOOL DATE · 工具点时间</div>
            <p className="mt-1.5 text-[12.5px] text-ink-faint">显示在首页封面右侧勘测路线上的工具标记日期（YYYY-MM-DD）</p>
            <div className="mt-3 max-w-xs">
              <label className={labelCls}>日期 DATE</label>
              <input
                type="text"
                value={cfg.date}
                onChange={(e) => setCfg((c) => ({ ...c, date: e.target.value }))}
                placeholder="2026-09-03"
                className={inputCls}
              />
            </div>
          </section>

          {/* 各区块文案 */}
          {SECTIONS.map((sec) => {
            const secObj = cfg[sec.key] as Record<string, string>;
            return (
            <section key={sec.key} className="rounded-2xl border border-line p-5">
              <div className="flex items-baseline gap-3">
                <span className="mono-label !text-accent">{sec.en}</span>
                <span className="text-[15px] font-semibold text-ink">{sec.title}</span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {sec.fields.map((f) => (
                  <div key={f.key} className={f.multi ? 'sm:col-span-2' : ''}>
                    <label className={labelCls}>{f.label}</label>
                    {f.multi ? (
                      <textarea
                        rows={3}
                        value={String(secObj[f.key] ?? '')}
                        onChange={(e) =>
                          setCfg((c) => ({ ...c, [sec.key]: { ...(c[sec.key] as Record<string, string>), [f.key]: e.target.value } }))
                        }
                        className={inputCls}
                      />
                    ) : (
                      <input
                        type="text"
                        value={String(secObj[f.key] ?? '')}
                        onChange={(e) =>
                          setCfg((c) => ({ ...c, [sec.key]: { ...(c[sec.key] as Record<string, string>), [f.key]: e.target.value } }))
                        }
                        className={inputCls}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
            );
          })}

          {/* 更多工具（规划中）列表 */}
          <section className="rounded-2xl border border-line p-5">
            <div className="flex items-baseline gap-3">
              <span className="mono-label !text-accent">MORE TOOLS</span>
              <span className="text-[15px] font-semibold text-ink">更多工具 · 规划中</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>标题 TITLE</label>
                <input
                  type="text"
                  value={cfg.future.title}
                  onChange={(e) => setCfg((c) => ({ ...c, future: { ...c.future, title: e.target.value } }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>英文 EN</label>
                <input
                  type="text"
                  value={cfg.future.en}
                  onChange={(e) => setCfg((c) => ({ ...c, future: { ...c.future, en: e.target.value } }))}
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>提示 HINT</label>
                <input
                  type="text"
                  value={cfg.future.hint}
                  onChange={(e) => setCfg((c) => ({ ...c, future: { ...c.future, hint: e.target.value } }))}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="mt-5">
              <label className={labelCls}>工具列表 ITEMS</label>
              <div className="space-y-2.5">
                {cfg.future.items.map((it, i) => (
                  <div key={i} className="rounded-xl border border-line p-3">
                    <div className="grid gap-2.5 sm:grid-cols-[1fr_1.6fr_110px_auto]">
                      <input
                        type="text"
                        value={it.name}
                        placeholder="工具名"
                        onChange={(e) =>
                          setCfg((c) => {
                            const next = clone(c);
                            next.future.items[i].name = e.target.value;
                            return next;
                          })
                        }
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={it.desc}
                        placeholder="介绍"
                        onChange={(e) =>
                          setCfg((c) => {
                            const next = clone(c);
                            next.future.items[i].desc = e.target.value;
                            return next;
                          })
                        }
                        className={inputCls}
                      />
                      <input
                        type="text"
                        value={it.status}
                        placeholder="状态"
                        onChange={(e) =>
                          setCfg((c) => {
                            const next = clone(c);
                            next.future.items[i].status = e.target.value;
                            return next;
                          })
                        }
                        className={inputCls}
                      />
                      <button
                        onClick={() =>
                          setCfg((c) => ({ ...c, future: { ...c.future, items: c.future.items.filter((_, j) => j !== i) } }))
                        }
                        title="删除此项"
                        className="rounded-lg px-3 text-[14px] text-ink-faint transition-colors hover:text-accent"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setCfg((c) => ({
                      ...c,
                      future: { ...c.future, items: [...c.future.items, { name: '', desc: '', status: '规划中' }] },
                    }))
                  }
                  className="rounded-xl border border-dashed border-line-strong px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
                >
                  + 添加工具
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
