'use client';

import { useEffect, useState } from 'react';
import { api, TYPE_LABELS, type PostType, type Taxonomy } from './api';

const EMPTY: Taxonomy = { categories: { notes: [], research: [], projects: [] }, tags: [] };

export function TaxonomyManager({ onBack }: { onBack: () => void }) {
  const [tax, setTax] = useState<Taxonomy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [newCat, setNewCat] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    api<Taxonomy>('/api/taxonomy')
      .then((t) => setTax({ ...EMPTY, ...t, categories: { ...EMPTY.categories, ...t.categories } }))
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await api('/api/taxonomy', { method: 'PUT', body: JSON.stringify(tax) });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const addCategory = (t: PostType) => {
    const v = (newCat[t] || '').trim();
    if (!v || tax.categories[t].includes(v)) return;
    setTax({ ...tax, categories: { ...tax.categories, [t]: [...tax.categories[t], v] } });
    setNewCat({ ...newCat, [t]: '' });
  };

  const removeCategory = (t: PostType, c: string) =>
    setTax({ ...tax, categories: { ...tax.categories, [t]: tax.categories[t].filter((x) => x !== c) } });

  const addTag = () => {
    const v = newTag.trim();
    if (!v || tax.tags.includes(v)) return;
    setTax({ ...tax, tags: [...tax.tags, v] });
    setNewTag('');
  };

  const inputCls =
    'flex-1 rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none';
  const labelCls = 'mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase';

  return (
    <div className="mx-auto max-w-4xl px-6 pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            ADMIN · 分类与标签
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">分类与标签管理</h1>
          <p className="mt-3 text-[14px] text-ink-soft">
            这里维护编辑器里的候选项；文章实际的分类/标签以其 frontmatter 为准。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-4 py-2.5 text-[15px] text-ink-soft transition-colors hover:text-accent">
            ← 返回列表
          </button>
          <button
            onClick={save}
            disabled={saving || loading}
            className="rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? '保存中…' : '保存'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-3.5 text-[14px] text-accent">{error}</div>
      )}
      {saved && (
        <div className="mt-6 rounded-xl border border-line bg-panel px-5 py-3.5 font-mono text-[13px] text-ink-soft">
          已保存 ✓
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-ink-faint">加载中…</p>
      ) : (
        <>
          {/* 分类 */}
          {(Object.keys(TYPE_LABELS) as PostType[]).map((t) => (
            <div key={t} className="mt-6 rounded-2xl border border-line p-6">
              <div className={labelCls}>
                {TYPE_LABELS[t]} 分类 · {tax.categories[t].length}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {tax.categories[t].map((c) => (
                  <span
                    key={c}
                    className="flex items-center gap-2 rounded-lg border border-line bg-panel px-3.5 py-1.5 text-[14px] text-ink"
                  >
                    {c}
                    <button onClick={() => removeCategory(t, c)} className="text-ink-faint transition-colors hover:text-accent">
                      ×
                    </button>
                  </span>
                ))}
                {tax.categories[t].length === 0 && <span className="text-[14px] text-ink-faint">暂无分类</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className={inputCls}
                  value={newCat[t] || ''}
                  onChange={(e) => setNewCat({ ...newCat, [t]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory(t)}
                  placeholder={`新增${TYPE_LABELS[t]}分类，如「遥感与影像」`}
                />
                <button
                  onClick={() => addCategory(t)}
                  className="shrink-0 rounded-xl border border-line px-5 text-[14px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
                >
                  添加
                </button>
              </div>
            </div>
          ))}

          {/* 标签 */}
          <div className="mt-6 rounded-2xl border border-line p-6">
            <div className={labelCls}>标签 · {tax.tags.length}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {tax.tags.map((tag) => (
                <span
                  key={tag}
                  className="flex items-center gap-2 rounded-lg border border-accent/40 px-3.5 py-1.5 text-[14px] text-accent"
                >
                  {tag}
                  <button
                    onClick={() => setTax({ ...tax, tags: tax.tags.filter((x) => x !== tag) })}
                    className="text-accent/60 transition-colors hover:text-accent"
                  >
                    ×
                  </button>
                </span>
              ))}
              {tax.tags.length === 0 && <span className="text-[14px] text-ink-faint">暂无标签</span>}
            </div>
            <div className="mt-4 flex gap-2">
              <input
                className={inputCls}
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTag()}
                placeholder="新增标签，回车添加"
              />
              <button
                onClick={addTag}
                className="shrink-0 rounded-xl border border-line px-5 text-[14px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
              >
                添加
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
