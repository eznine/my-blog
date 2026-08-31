'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  api,
  clearToken,
  getToken,
  parseFrontmatter,
  setToken,
  TYPE_LABELS,
  type PostListItem,
  type PostType,
  type Taxonomy,
} from './api';
import { PostEditor } from './post-editor';
import { TaxonomyManager } from './taxonomy-manager';
import { AppearanceManager } from './appearance-manager';

type View = 'login' | 'list' | 'editor' | 'taxonomy' | 'appearance';

interface BulkResult {
  imported: number;
  items: { slug: string; title: string }[];
  skipped: { name: string; reason: string }[];
}

interface EditorTarget {
  type: PostType;
  slug: string | null;
  prefill?: { meta: Record<string, unknown>; content: string };
}

export function AdminApp() {
  const [view, setView] = useState<View>('login');
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  const [type, setType] = useState<PostType>('notes');
  const [posts, setPosts] = useState<PostListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [editorTarget, setEditorTarget] = useState<EditorTarget | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  /* ---- 批量导入 ---- */
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<{ name: string; content: string }[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkCats, setBulkCats] = useState<string[]>([]);
  const [bulkDrag, setBulkDrag] = useState(false);
  const bulkInputRef = useRef<HTMLInputElement>(null);

  /* ---- 会话检查 ---- */
  useEffect(() => {
    if (!getToken()) {
      setChecked(true);
      return;
    }
    api('/api/posts?type=notes')
      .then(() => setView('list'))
      .catch(() => {
        clearToken();
        setView('login');
      })
      .finally(() => setChecked(true));
  }, []);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api<{ token: string }>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      setToken(r.token);
      setView('list');
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  const logout = () => {
    clearToken();
    setView('login');
    setPassword('');
  };

  /* ---- 列表加载 ---- */
  const loadPosts = useCallback(async (t: PostType) => {
    setLoading(true);
    setError('');
    try {
      const r = await api<{ items: PostListItem[] }>(`/api/posts?type=${t}`);
      setPosts(r.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (view === 'list') loadPosts(type);
  }, [view, type, loadPosts]);

  const remove = async (slug: string, title: string) => {
    if (!window.confirm(`确定删除《${title}》？此操作会删除源文件，不可恢复。`)) return;
    try {
      await api(`/api/posts?type=${type}&slug=${encodeURIComponent(slug)}`, { method: 'DELETE' });
      loadPosts(type);
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  /* ---- MD 导入：读取文件 → 预填编辑器 ---- */
  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const raw = await file.text();
    const { data, content } = parseFrontmatter(raw);
    if (!data.title) {
      const h1 = content.match(/^#\s+(.+)$/m);
      if (h1) data.title = h1[1].trim();
      else data.title = file.name.replace(/\.mdx?$/, '');
    }
    if (!data.date) data.date = new Date().toISOString().slice(0, 10);
    setEditorTarget({ type, slug: null, prefill: { meta: data, content } });
    setView('editor');
  };

  /* ---- 批量导入：多文件 + 统一分类 + 追加标签 ---- */
  const openBulk = () => {
    setBulkOpen(true);
    setBulkResult(null);
    setBulkError('');
    api<Taxonomy>('/api/taxonomy')
      .then((t) => setBulkCats(t.categories[type] || []))
      .catch(() => setBulkCats([]));
  };

  const addBulkFiles = async (files: File[]) => {
    const mds = files.filter((f) => /\.mdx?$/i.test(f.name));
    if (!mds.length) return;
    const parsed = await Promise.all(mds.map(async (f) => ({ name: f.name, content: await f.text() })));
    setBulkFiles((prev) => [...prev, ...parsed]);
    setBulkResult(null);
  };

  const onBulkSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await addBulkFiles(Array.from(e.target.files || []));
    e.target.value = '';
  };

  const submitBulk = async () => {
    if (!bulkFiles.length || bulkBusy) return;
    setBulkBusy(true);
    setBulkError('');
    try {
      const tags = bulkTags
        .split(/[,，、\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      const r = await api<BulkResult>(`/api/posts/bulk?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({ files: bulkFiles, category: bulkCategory.trim(), tags }),
      });
      setBulkResult(r);
      setBulkFiles([]);
      setBulkCategory('');
      setBulkTags('');
      loadPosts(type);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setBulkBusy(false);
    }
  };

  /* ================= 登录视图 ================= */
  if (!checked) {
    return (
      <div className="py-32 text-center">
        <p className="mono-label">CHECKING SESSION…</p>
      </div>
    );
  }

  if (view === 'login') {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-6 py-20">
        <form onSubmit={login} className="w-full max-w-sm">
          <div className="rounded-2xl border border-line glass p-8">
            <div className="mono-label flex items-center gap-2.5 !text-accent">
              <span className="marker-dot is-live !h-[5px] !w-[5px]" />
              ADMIN · 后台管理
            </div>
            <h1 className="mt-4 text-2xl font-bold text-ink">内容管理登录</h1>
            <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
              管理笔记、研究、项目与分类标签。需要本地同时运行站点（npm run dev）与后台服务（npm run
              admin）。
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="后台密码"
              autoFocus
              className="mt-6 w-full rounded-xl border border-line bg-panel px-4 py-3 text-[16px] text-ink transition-all focus:border-accent/60 focus:outline-none"
            />
            {error && <p className="mt-3 text-[13px] text-accent">{error}</p>}
            <button
              type="submit"
              className="mt-5 w-full rounded-xl px-6 py-3 font-semibold text-white transition-transform hover:scale-[1.02] active:scale-95"
              style={{ background: 'var(--accent)' }}
            >
              <span style={{ textShadow: 'none' }}>登录</span>
            </button>
            <p className="mt-4 text-center font-mono text-[11px] tracking-[0.14em] text-ink-faint uppercase">
              密码配置于 site.config.json · adminPassword
            </p>
          </div>
        </form>
      </div>
    );
  }

  /* ================= 编辑器 / 分类标签 ================= */
  if (view === 'editor' && editorTarget) {
    return (
      <PostEditor
        key={editorTarget.slug || 'new'}
        type={editorTarget.type}
        slug={editorTarget.slug}
        prefill={editorTarget.prefill}
        onBack={() => {
          setEditorTarget(null);
          setView('list');
        }}
      />
    );
  }

  if (view === 'taxonomy') {
    return (
      <TaxonomyManager
        onBack={() => {
          setView('list');
        }}
      />
    );
  }

  if (view === 'appearance') {
    return (
      <AppearanceManager
        onBack={() => {
          setView('list');
        }}
      />
    );
  }

  /* ================= 文章列表 ================= */
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            ADMIN · 内容管理
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">文章管理</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              setEditorTarget({ type, slug: null });
              setView('editor');
            }}
            className="rounded-xl px-5 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
            style={{ background: 'var(--accent)' }}
          >
            + 新建文章
          </button>
          <button
            onClick={() => importRef.current?.click()}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            导入 MD
          </button>
          <input ref={importRef} type="file" accept=".md,.mdx" hidden onChange={onImportFile} />
          <button
            onClick={openBulk}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            批量导入
          </button>
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              setView('taxonomy');
            }}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            分类与标签
          </Link>
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              setView('appearance');
            }}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            外观设置
          </Link>
          <button onClick={logout} className="px-3 py-2.5 text-[14px] text-ink-faint transition-colors hover:text-accent">
            退出
          </button>
        </div>
      </div>

      {/* 类型切换 */}
      <div className="mt-8 flex gap-2">
        {(Object.keys(TYPE_LABELS) as PostType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-lg px-5 py-2 text-[15px] font-medium transition-colors ${
              type === t ? 'bg-accent text-white' : 'border border-line text-ink-soft hover:text-ink'
            }`}
          >
            {TYPE_LABELS[t]}
            <span className={`ml-2 font-mono text-[12px] ${type === t ? 'text-white/75' : 'text-ink-faint'}`}>
              {t === type ? posts.length : ''}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-4 text-[14px] text-accent">
          {error}
        </div>
      )}

      {/* 列表 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        {loading ? (
          <p className="px-6 py-14 text-center text-ink-faint">加载中…</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-faint">
            还没有{TYPE_LABELS[type]}，点击右上角「新建文章」开始创作。
          </p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="px-5 py-3.5 font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">标题</th>
                <th className="hidden px-4 py-3.5 font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase md:table-cell">
                  日期
                </th>
                <th className="hidden px-4 py-3.5 font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase lg:table-cell">
                  分类
                </th>
                <th className="px-4 py-3.5 text-right font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.slug} className="border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.04]">
                  <td className="px-5 py-3.5">
                    <div className="text-[15px] font-medium text-ink">{p.title || p.slug}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-ink-faint">/{p.slug}</div>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3.5 font-mono text-[13px] text-ink-soft md:table-cell">
                    {p.date}
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
                    {p.category ? (
                      <span className="rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-soft">
                        {p.category}
                      </span>
                    ) : (
                      <span className="text-[12px] text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setEditorTarget({ type, slug: p.slug });
                        setView('editor');
                      }}
                      className="rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors hover:text-accent"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => remove(p.slug, p.title)}
                      className="ml-1 rounded-lg px-3 py-1.5 text-[13px] font-medium text-ink-faint transition-colors hover:text-accent"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ============ 批量导入弹窗 ============ */}
      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          onClick={() => {
            if (!bulkBusy) setBulkOpen(false);
          }}
        >
          <div
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-line bg-panel-solid p-6 shadow-2xl md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-ink">批量导入 MD</h2>
                <p className="mt-1.5 text-[13px] text-ink-soft">
                  将导入到：<span className="text-accent">{TYPE_LABELS[type]}</span> · 支持多选与拖拽，可统一分类并追加标签
                </p>
              </div>
              <button
                onClick={() => {
                  if (!bulkBusy) setBulkOpen(false);
                }}
                className="rounded-lg px-2 py-1 text-[16px] text-ink-faint transition-colors hover:text-accent"
              >
                ×
              </button>
            </div>

            {/* 文件选择 / 拖拽区 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setBulkDrag(true);
              }}
              onDragLeave={() => setBulkDrag(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setBulkDrag(false);
                await addBulkFiles(Array.from(e.dataTransfer.files));
              }}
              className={`mt-5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                bulkDrag ? 'border-accent bg-accent/5' : 'border-line-strong'
              }`}
            >
              <p className="text-[14px] text-ink-soft">把 .md / .mdx 文件拖到这里，或</p>
              <button
                onClick={() => bulkInputRef.current?.click()}
                className="mt-3 rounded-xl px-5 py-2 text-[14px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95"
                style={{ background: 'var(--accent)' }}
              >
                <span style={{ textShadow: 'none' }}>选择文件（可多选）</span>
              </button>
              <input ref={bulkInputRef} type="file" accept=".md,.mdx" multiple hidden onChange={onBulkSelect} />
            </div>

            {/* 已选文件列表 */}
            {bulkFiles.length > 0 && (
              <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-line">
                {bulkFiles.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 last:border-0">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{f.name}</span>
                    <button
                      onClick={() => setBulkFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-[13px] text-ink-faint transition-colors hover:text-accent"
                    >
                      移除
                    </button>
                  </div>
                ))}
                <div className="px-4 py-2 text-[12px] text-ink-faint">共 {bulkFiles.length} 个文件</div>
              </div>
            )}

            {/* 统一分类 + 追加标签 */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                  统一分类（留空则保留文件原有分类）
                </label>
                <input
                  type="text"
                  list="bulk-cat-options"
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  placeholder="如：Web 基础"
                  className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none"
                />
                <datalist id="bulk-cat-options">
                  {[...new Set([...bulkCats, ...posts.map((p) => p.category).filter(Boolean)])].map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                  追加标签（逗号分隔，会合并到每个文件的标签）
                </label>
                <input
                  type="text"
                  value={bulkTags}
                  onChange={(e) => setBulkTags(e.target.value)}
                  placeholder="如：GIS, 学习笔记"
                  className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none"
                />
              </div>
            </div>

            {bulkError && <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-[13.5px] text-accent">{bulkError}</div>}

            {bulkResult && (
              <div className="mt-4 rounded-xl border border-line bg-panel px-4 py-3.5 text-[13.5px] text-ink-soft">
                成功导入 <span className="font-semibold text-accent">{bulkResult.imported}</span> 篇
                {bulkResult.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bulkResult.items.slice(0, 8).map((it) => (
                      <div key={it.slug} className="truncate">
                        · {it.title} <span className="font-mono text-[11px] text-ink-faint">/{it.slug}</span>
                      </div>
                    ))}
                    {bulkResult.items.length > 8 && <div>… 共 {bulkResult.items.length} 篇</div>}
                  </div>
                )}
                {bulkResult.skipped.length > 0 && (
                  <div className="mt-2 text-accent">
                    跳过 {bulkResult.skipped.length} 个：
                    {bulkResult.skipped.map((s) => `${s.name}（${s.reason}）`).join('、')}
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setBulkOpen(false)}
                className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:text-ink"
              >
                关闭
              </button>
              <button
                onClick={submitBulk}
                disabled={!bulkFiles.length || bulkBusy}
                className="rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                <span style={{ textShadow: 'none' }}>
                  {bulkBusy ? '导入中…' : `导入 ${bulkFiles.length || ''} 个文件`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
