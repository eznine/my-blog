'use client';

import { useEffect, useState } from 'react';
import { api, TYPE_LABELS, type PostType, type Taxonomy } from './api';

const EMPTY: Taxonomy = {
  categories: { notes: [], research: [], projects: [] },
  chapters: {},
  tags: [],
};

export function TaxonomyManager({ onBack }: { onBack: () => void }) {
  const [tax, setTax] = useState<Taxonomy>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<string | boolean>(false);
  const [newCat, setNewCat] = useState<Record<string, string>>({});
  const [newTag, setNewTag] = useState('');
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const [newChapter, setNewChapter] = useState<Record<string, string>>({});

  /* ---- 拖拽排序 ---- */
  const [dragCat, setDragCat] = useState<{ t: PostType; i: number } | null>(null);
  const [overCat, setOverCat] = useState<{ t: PostType; i: number } | null>(null);
  const [dragCh, setDragCh] = useState<{ c: string; i: number } | null>(null);
  const [overCh, setOverCh] = useState<{ c: string; i: number } | null>(null);

  const reload = () => {
    return api<Taxonomy>('/api/taxonomy')
      .then((t) =>
        setTax({
          ...EMPTY,
          ...t,
          categories: { ...EMPTY.categories, ...t.categories },
          chapters: t.chapters || {},
        })
      )
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
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

  /* ---- 大类 ---- */
  const addCategory = (t: PostType) => {
    const v = (newCat[t] || '').trim();
    if (!v || tax.categories[t].includes(v)) return;
    setTax({ ...tax, categories: { ...tax.categories, [t]: [...tax.categories[t], v] } });
    setNewCat({ ...newCat, [t]: '' });
  };

  const removeCategory = (t: PostType, c: string) =>
    setTax({ ...tax, categories: { ...tax.categories, [t]: tax.categories[t].filter((x) => x !== c) } });

  /* ---- 拖拽排序移动 ---- */
  const moveCategory = (t: PostType, from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const list = [...tax.categories[t]];
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    setTax({ ...tax, categories: { ...tax.categories, [t]: list } });
  };

  const moveChapter = (c: string, from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const list = [...chaptersOf(c)];
    const [m] = list.splice(from, 1);
    list.splice(to, 0, m);
    setTax({ ...tax, chapters: { ...tax.chapters, [c]: list } });
  };

  const rename = async (t: PostType, kind: 'category' | 'chapter', from: string, owner?: string) => {
    const to = window.prompt(`重命名「${from}」为：`, from);
    if (!to || to.trim() === from) return;
    try {
      const r = await api<{ updated: number }>(`/api/taxonomy/rename?type=${t}`, {
        method: 'POST',
        body: JSON.stringify({ kind, from, to: to.trim(), category: owner }),
      });
      setSaved(`已重命名「${from}」→「${to.trim()}」，同步更新 ${r.updated} 篇文章`);
      setTimeout(() => setSaved(false), 3000);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : '重命名失败');
    }
  };

  /* ---- 章节 ---- */
  const chaptersOf = (c: string) => tax.chapters?.[c] ?? [];

  const addChapter = (c: string) => {
    const v = (newChapter[c] || '').trim();
    if (!v) return;
    const list = chaptersOf(c);
    if (list.includes(v)) return;
    setTax({ ...tax, chapters: { ...tax.chapters, [c]: [...list, v] } });
    setNewChapter({ ...newChapter, [c]: '' });
  };

  const removeChapter = (c: string, ch: string) =>
    setTax({ ...tax, chapters: { ...tax.chapters, [c]: chaptersOf(c).filter((x) => x !== ch) } });

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
            维护大类、大类下的章节与标签候选；文章实际的分类/章节/标签以其 frontmatter 为准。
            重命名会同步更新所有相关文章。
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
          {typeof saved === 'string' ? saved : '已保存 ✓'}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-ink-faint">加载中…</p>
      ) : (
        <>
          {/* 大类与章节 */}
          {(Object.keys(TYPE_LABELS) as PostType[]).map((t) => (
            <div key={t} className="mt-6 rounded-2xl border border-line p-6">
              <div className={labelCls}>
                {TYPE_LABELS[t]} 大类 · {tax.categories[t].length}
              </div>
              <div className="mt-3 space-y-3">
                {tax.categories[t].map((c, i) => {
                  const chs = chaptersOf(c);
                  const open = !!openChapters[c];
                  const isDragSrc = dragCat?.t === t && dragCat.i === i;
                  const isOver = dragCat !== null && dragCat.t === t && overCat?.t === t && overCat.i === i;
                  return (
                    <div
                      key={c}
                      draggable
                      onDragStart={(e) => {
                        setDragCat({ t, i });
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setOverCat({ t, i });
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const d = dragCat;
                        if (d && d.t === t) moveCategory(t, d.i, i);
                        setDragCat(null);
                        setOverCat(null);
                      }}
                      onDragEnd={() => {
                        setDragCat(null);
                        setOverCat(null);
                      }}
                      className={`rounded-xl border p-3.5 transition-all ${
                        isDragSrc ? 'opacity-40' : isOver ? '-translate-y-0.5 border-accent/70 bg-accent/5' : 'border-line/70'
                      } bg-panel/40`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="cursor-grab select-none font-mono text-[14px] text-ink-faint transition-colors active:cursor-grabbing hover:text-accent"
                          title="拖动排序大类（保存后前台按此顺序展示）"
                        >
                          ⠿
                        </span>
                        <span className="text-[15px] font-medium text-ink">{c}</span>
                        <button
                          onClick={() => setOpenChapters({ ...openChapters, [c]: !open })}
                          className="rounded-md border border-line px-2.5 py-1 font-mono text-[11.5px] text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
                        >
                          章节 {chs.length} {open ? '▲' : '▼'}
                        </button>
                        <span className="ml-auto flex items-center gap-2">
                          <button
                            onClick={() => rename(t, 'category', c)}
                            title="重命名（同步更新文章）"
                            className="rounded-md px-2 py-1 text-[13px] text-ink-faint transition-colors hover:text-accent"
                          >
                            ✎ 重命名
                          </button>
                          <button
                            onClick={() => removeCategory(t, c)}
                            title="从候选中移除（不影响文章）"
                            className="rounded-md px-2 py-1 text-[13px] text-ink-faint transition-colors hover:text-accent"
                          >
                            × 移除
                          </button>
                        </span>
                      </div>

                      {open && (
                        <div className="mt-3 border-t border-line/60 pt-3">
                          <div className="mb-2 font-mono text-[11px] tracking-[0.1em] text-ink-faint">
                            拖动 ⠿ 排序章节（保存后前台笔记页按此顺序展示）
                          </div>
                          {chs.length > 0 ? (
                            <div className="space-y-1.5">
                              {chs.map((ch, i) => {
                                const isDragSrc = dragCh?.c === c && dragCh.i === i;
                                const isOver = dragCh !== null && dragCh.c === c && overCh?.c === c && overCh.i === i;
                                return (
                                  <div
                                    key={ch}
                                    draggable
                                    onDragStart={(e) => {
                                      setDragCh({ c, i });
                                      e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    onDragOver={(e) => {
                                      e.preventDefault();
                                      setOverCh({ c, i });
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const d = dragCh;
                                      if (d && d.c === c) moveChapter(c, d.i, i);
                                      setDragCh(null);
                                      setOverCh(null);
                                    }}
                                    onDragEnd={() => {
                                      setDragCh(null);
                                      setOverCh(null);
                                    }}
                                    className={`flex cursor-grab items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-all active:cursor-grabbing ${
                                      isDragSrc ? 'opacity-40' : isOver ? 'border-accent/70 bg-accent/5' : 'border-line'
                                    } bg-panel`}
                                  >
                                    <span className="select-none font-mono text-[13px] text-ink-faint" title="拖动排序">
                                      ⠿
                                    </span>
                                    <span className="flex-1 text-[13.5px] text-ink">{ch}</span>
                                    <button
                                      onClick={() => rename(t, 'chapter', ch, c)}
                                      title="重命名（同步更新文章）"
                                      className="text-ink-faint transition-colors hover:text-accent"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      onClick={() => removeChapter(c, ch)}
                                      className="text-ink-faint transition-colors hover:text-accent"
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-[13px] text-ink-faint">
                              暂无章节——如「01 环境配置 / 02 Web 基础」
                            </p>
                          )}
                          <div className="mt-3 flex gap-2">
                            <input
                              className={inputCls}
                              value={newChapter[c] || ''}
                              onChange={(e) => setNewChapter({ ...newChapter, [c]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && addChapter(c)}
                              placeholder={`在「${c}」下新增章节，如「03 React」`}
                            />
                            <button
                              onClick={() => addChapter(c)}
                              className="shrink-0 rounded-xl border border-line px-5 text-[14px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
                            >
                              添加
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {tax.categories[t].length === 0 && <span className="text-[14px] text-ink-faint">暂无大类</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <input
                  className={inputCls}
                  value={newCat[t] || ''}
                  onChange={(e) => setNewCat({ ...newCat, [t]: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && addCategory(t)}
                  placeholder={`新增${TYPE_LABELS[t]}大类，如「WebGIS 开发」`}
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
