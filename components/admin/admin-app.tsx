'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { site } from '@/lib/site';
import {
  api,
  clearToken,
  getToken,
  parseFrontmatter,
  setToken,
  TYPE_LABELS,
  uploadImage,
  type PostListItem,
  type PostType,
  type Taxonomy,
} from './api';
import { PostEditor } from './post-editor';
import { TaxonomyManager } from './taxonomy-manager';
import { AppearanceManager } from './appearance-manager';
import { TaxonomySelect } from './taxonomy-select';
import { ListPreview } from './list-preview';

type View = 'login' | 'list' | 'editor' | 'taxonomy' | 'appearance';

interface BulkResult {
  imported: number;
  items: { slug: string; title: string }[];
  skipped: { name: string; reason: string }[];
}

interface BulkMd {
  name: string;
  relPath: string;
  content: string;
}

interface PickedFile {
  file: File;
  relPath: string;
}

/** 相对路径解析：从 md 自身位置出发，把 ../xx/yy.png 解析成文件夹内的标准相对路径 */
function resolveRelPath(fromRel: string, ref: string): string {
  const parts = fromRel.split('/').slice(0, -1);
  for (const p of ref.split('/')) {
    if (p === '..') parts.pop();
    else if (p !== '.') parts.push(p);
  }
  return parts.join('/');
}

const IMG_RE = /\.(png|jpe?g|gif|webp|svg|avif|bmp|ico)$/i;

/** 后台列表筛选的「分类 / 标签」小按钮，样式与前台筛选按钮一致 */
function FilterChip({
  active,
  small,
  onClick,
  children,
}: {
  active: boolean;
  small?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border transition-all ${
        active
          ? 'border-accent bg-accent/10 font-medium text-accent'
          : 'border-line bg-panel text-ink-soft hover:border-accent/50 hover:text-accent'
      } ${small ? 'px-2.5 py-0.5 text-[12.5px]' : 'px-3 py-1 text-[13px]'}`}
    >
      {children}
    </button>
  );
}

/** 拖拽项（支持文件夹）递归展开成文件列表，带上自构的相对路径 */
async function readDropEntries(items: DataTransferItemList): Promise<PickedFile[]> {
  const out: PickedFile[] = [];
  const walk = async (entry: FileSystemEntry, prefix: string): Promise<void> => {
    if (entry.isFile) {
      const file = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
      out.push({ file, relPath: prefix + file.name });
    } else if (entry.isDirectory) {
      const reader = (entry as FileSystemDirectoryEntry).createReader();
      for (;;) {
        const batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  const entries: FileSystemEntry[] = [];
  for (const item of Array.from(items)) {
    const entry = item.webkitGetAsEntry();
    if (entry) entries.push(entry);
  }
  for (const entry of entries) await walk(entry, '');
  return out;
}

interface EditorTarget {
  type: PostType;
  slug: string | null;
  prefill?: { meta: Record<string, unknown>; content: string };
}

export function AdminApp() {
  const [view, setView] = useState<View>('login');

  /* ---- 视图与浏览器历史联动：进入编辑/分类/外观可 pushState，浏览器后退/「返回」可直接回列表 ---- */
  const navView = (v: View) => {
    setView(v);
    if (v !== 'list') window.history.pushState({ v }, '', `#${v}`);
  };
  const navList = () => {
    setEditorTarget(null);
    setRowEdit(null);
    if (window.history.state?.v) window.history.back();
    else setView('list');
  };
  useEffect(() => {
    const onPop = () => {
      const st = window.history.state as { v?: View } | null;
      const v = st?.v;
      setView(v && v !== 'login' ? v : 'list');
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
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
  const [bulkFiles, setBulkFiles] = useState<BulkMd[]>([]);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkChapter, setBulkChapter] = useState('');
  const [bulkTags, setBulkTags] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState('');
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);
  const [bulkCats, setBulkCats] = useState<string[]>([]);
  const [bulkChapters, setBulkChapters] = useState<Record<string, string[]>>({});
  const [bulkDrag, setBulkDrag] = useState(false);
  const [bulkImg, setBulkImg] = useState<{ done: number; total: number } | null>(null);
  const imageMapRef = useRef<Map<string, string>>(new Map());
  const bulkInputRef = useRef<HTMLInputElement>(null);
  const bulkDirInputRef = useRef<HTMLInputElement>(null);

  /* ---- 批量操作（列表勾选） ---- */
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchOpen, setBatchOpen] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);
  const [batchError, setBatchError] = useState('');
  const [batchDone, setBatchDone] = useState('');
  const [beCatOn, setBeCatOn] = useState(false);
  const [beCat, setBeCat] = useState('');
  const [beChapOn, setBeChapOn] = useState(false);
  const [beChap, setBeChap] = useState('');
  const [beHidden, setBeHidden] = useState(''); // '' | 'hide' | 'show'
  const [beAddTags, setBeAddTags] = useState('');
  const [beRmTags, setBeRmTags] = useState('');

  /* ---- 列表筛选（仿前端笔记页：关键词 + 分类 + 章节 + 标签） ---- */
  const [listQuery, setListQuery] = useState('');
  const [listCat, setListCat] = useState<string | null>(null);
  const [listChapter, setListChapter] = useState<string | null>(null);
  const [listTag, setListTag] = useState<string | null>(null);

  /* ---- 列表视图：编辑表格 / 前端排列预览 ---- */
  const [listMode, setListMode] = useState<'table' | 'preview'>('table');

  /* ---- 行内快速修改（日期 / 分类，PATCH /api/posts/meta 只改 frontmatter、不搬文件） ---- */
  const [rowEdit, setRowEdit] = useState<{ slug: string; field: 'date' | 'category'; draft: string } | null>(null);
  const [rowMsg, setRowMsg] = useState<string | null>(null);
  const rowMsgTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashRowMsg = (m: string) => {
    setRowMsg(m);
    if (rowMsgTimer.current) clearTimeout(rowMsgTimer.current);
    rowMsgTimer.current = setTimeout(() => setRowMsg(null), 2600);
  };

  /** 解析日期输入：支持 2026/09/01 与 2026-09-01，非法返回 null */
  const normalizeDateInput = (raw: string): string | null => {
    const m = raw.trim().match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (!m) return null;
    const y = +m[1];
    const mo = +m[2];
    const d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return `${String(y).padStart(4, '0')}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const patchMeta = async (slug: string, patch: { date?: string; category?: string }) => {
    try {
      const r = await api<{ ok: boolean; date?: string; category?: string }>(`/api/posts/meta?type=${type}`, {
        method: 'PATCH',
        body: JSON.stringify({ slug, ...patch }),
      });
      setPosts((prev) =>
        prev.map((x) =>
          x.slug === slug
            ? { ...x, date: r.date ?? x.date, category: r.category !== undefined ? r.category : x.category }
            : x,
        ),
      );
      flashRowMsg('已保存');
    } catch (e) {
      flashRowMsg(e instanceof Error ? e.message : '保存失败');
    }
    setRowEdit(null);
  };

  const saveRowDate = (slug: string, raw: string) => {
    const norm = normalizeDateInput(raw);
    if (norm) void patchMeta(slug, { date: norm });
    else {
      flashRowMsg('日期格式无效，支持 2026/09/01 或 2026-09-01');
      setRowEdit(null);
    }
  };

  const saveRowCategory = (slug: string, draft: string) => void patchMeta(slug, { category: draft.trim() });

  /** 行内分类候选（taxonomy 聚合 + 文章实际使用） */
  const catCandidates = useMemo(
    () => [
      ...new Set([...bulkCats, ...posts.map((p) => p.category).filter((c): c is string => Boolean(c))]),
    ],
    [bulkCats, posts],
  );

  /** 预览视图：同日拖拽排序 → 批量写入 order（前台笔记页同规则生效） */
  const reorderPosts = async (list: { slug: string; order: number }[]) => {
    try {
      const r = await api<{ ok: boolean; updated: number }>(`/api/posts/reorder?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({ list }),
      });
      setPosts((prev) =>
        prev.map((p) => {
          const it = list.find((l) => l.slug === p.slug);
          return it ? { ...p, order: it.order } : p;
        }),
      );
      flashRowMsg(`排序已保存（${r.updated} 篇）`);
    } catch (e) {
      flashRowMsg(e instanceof Error ? e.message : '排序保存失败');
    }
  };

  useEffect(() => {
    setSelected(new Set());
    setListQuery('');
    setListCat(null);
    setListChapter(null);
    setListTag(null);
  }, [type]);

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

  /* ---- 批量导入：多文件/文件夹 + 图片自动上传改路径 + 大类/章节/标签（均可选） ---- */
  const openBulk = () => {
    setBulkOpen(true);
    setBulkResult(null);
    setBulkError('');
    api<Taxonomy>('/api/taxonomy')
      .then((t) => {
        setBulkCats(t.categories[type] || []);
        setBulkChapters(t.chapters || {});
      })
      .catch(() => {
        setBulkCats([]);
        setBulkChapters({});
      });
  };

  const addBulkFiles = async (picked: PickedFile[]) => {
    if (!picked.length || bulkBusy) return;
    const mds = picked.filter((p) => /\.mdx?$/i.test(p.file.name));
    const imgs = picked.filter((p) => IMG_RE.test(p.file.name));
    if (!mds.length && !imgs.length) return;

    setBulkBusy(true);
    setBulkError('');
    try {
      // 图片先传服务器，记「原相对路径 → 新 URL」映射
      if (imgs.length) {
        setBulkImg({ done: 0, total: imgs.length });
        let done = 0;
        const BATCH = 8;
        for (let i = 0; i < imgs.length; i += BATCH) {
          const batch = imgs.slice(i, i + BATCH);
          const urls = await Promise.all(batch.map(({ file }) => uploadImage(file)));
          batch.forEach(({ relPath }, j) => imageMapRef.current.set(relPath, urls[j]));
          done += batch.length;
          setBulkImg({ done, total: imgs.length });
        }
        setTimeout(() => setBulkImg(null), 2500);
      }
      // md 读取文本（路径重写推迟到提交时，晚选的图片也能被先选的 md 用上）
      const parsed: BulkMd[] = await Promise.all(
        mds.map(async ({ file, relPath }) => ({
          name: file.name,
          relPath,
          content: await file.text(),
        }))
      );
      setBulkFiles((prev) => [...prev, ...parsed]);
      setBulkResult(null);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : '图片上传失败');
    } finally {
      setBulkBusy(false);
    }
  };

  const pickFromInput = (files: FileList | null): PickedFile[] =>
    Array.from(files || []).map((file) => ({ file, relPath: file.webkitRelativePath || file.name }));

  const onBulkSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await addBulkFiles(pickFromInput(e.target.files));
    e.target.value = '';
  };

  /** 提交时统一把 md 内相对图片路径替换为已上传的 URL */
  const rewriteBulkContent = (md: BulkMd): string =>
    md.content.replace(/(!\[[^\]]*\]\()(<[^>]+>|[^)\s]+)/g, (m, head: string, urlRaw: string) => {
      const url = urlRaw.startsWith('<') ? urlRaw.slice(1, -1) : urlRaw;
      if (/^(https?:|data:|\/|#)/.test(url) || !imageMapRef.current.size) return m;
      const key = resolveRelPath(md.relPath, decodeURIComponent(url));
      const newUrl = imageMapRef.current.get(key);
      return newUrl ? `${head}${newUrl}` : m;
    });

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
        body: JSON.stringify({
          files: bulkFiles.map((f) => ({ name: f.name, content: rewriteBulkContent(f) })),
          category: bulkCategory.trim(),
          chapter: bulkCategory.trim() ? bulkChapter.trim() : '',
          tags,
        }),
      });
      setBulkResult(r);
      setBulkFiles([]);
      imageMapRef.current.clear();
      setBulkCategory('');
      setBulkChapter('');
      setBulkTags('');
      loadPosts(type);
    } catch (err) {
      setBulkError(err instanceof Error ? err.message : '导入失败');
    } finally {
      setBulkBusy(false);
    }
  };

  /* ---- 批量操作：勾选 / 全选（支持按住 Shift 连续多选） ---- */
  const lastSelRef = useRef<string | null>(null);
  const toggleSel = (slug: string, shiftKey = false) => {
    if (shiftKey && lastSelRef.current && lastSelRef.current !== slug) {
      // Shift 连选：把上次普通点击的行与当前行之间的所有行全部加入选中
      setSelected((prev) => {
        const next = new Set(prev);
        const list = filteredPosts.map((p) => p.slug);
        const a = list.indexOf(lastSelRef.current as string);
        const b = list.indexOf(slug);
        if (a === -1 || b === -1) return prev;
        const [lo, hi] = a < b ? [a, b] : [b, a];
        for (let k = lo; k <= hi; k++) next.add(list[k]);
        return next;
      });
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
    lastSelRef.current = slug;
  };

  /* ---- 列表筛选派生数据（仿前端笔记页） ---- */
  const listCats = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of posts) if (p.category) map.set(p.category, (map.get(p.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  }, [posts]);

  const listTags = useMemo(
    () => [...new Set(posts.flatMap((p) => p.tags || []))].sort((a, b) => a.localeCompare(b, 'zh')),
    [posts]
  );

  /** 选中分类下的章节（联动：选分类后出现章节筛选） */
  const listChapters = useMemo(() => {
    if (!listCat) return [] as [string, number][];
    const map = new Map<string, number>();
    for (const p of posts) if (p.category === listCat && p.chapter) map.set(p.chapter, (map.get(p.chapter) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh'));
  }, [posts, listCat]);

  const filterActive = listQuery.trim() !== '' || listCat !== null || listChapter !== null || listTag !== null;

  const filteredPosts = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    return posts.filter((p) => {
      if (listCat && p.category !== listCat) return false;
      if (listChapter && p.chapter !== listChapter) return false;
      if (listTag && !(p.tags || []).includes(listTag)) return false;
      if (q) {
        const hay = `${p.title ?? ''} ${p.summary ?? ''} ${p.category ?? ''} ${p.chapter ?? ''} ${(p.tags || []).join(' ')}`.toLowerCase();
        if (!q.split(/\s+/).every((token) => hay.includes(token))) return false;
      }
      return true;
    });
  }, [posts, listQuery, listCat, listTag]);

  const allSelected = filteredPosts.length > 0 && filteredPosts.every((p) => selected.has(p.slug));
  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(filteredPosts.map((p) => p.slug)));

  const selectedTags = useMemo(
    () => [...new Set(posts.filter((p) => selected.has(p.slug)).flatMap((p) => p.tags))],
    [posts, selected]
  );

  const openBatch = () => {
    setBatchOpen(true);
    setBatchError('');
    setBatchDone('');
    api<Taxonomy>('/api/taxonomy')
      .then((t) => {
        setBulkCats(t.categories[type] || []);
        setBulkChapters(t.chapters || {});
      })
      .catch(() => {});
  };

  const batchDelete = async () => {
    if (!selected.size || batchBusy) return;
    if (!window.confirm(`确定删除选中的 ${selected.size} 篇文章？此操作会删除源文件，不可恢复。`)) return;
    setBatchBusy(true);
    setBatchError('');
    try {
      await api(`/api/posts/batch?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({ type, action: 'delete', slugs: [...selected] }),
      });
      setSelected(new Set());
      loadPosts(type);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : '批量删除失败');
    } finally {
      setBatchBusy(false);
    }
  };

  /** 批量隐藏：直接在操作条隐藏所选文章（前台不再显示，后台仍可管理/恢复） */
  const batchHide = async () => {
    if (!selected.size || batchBusy) return;
    setBatchBusy(true);
    setBatchError('');
    try {
      const r = await api<{ updated: number }>(`/api/posts/batch?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({ action: 'update', slugs: [...selected], hiddenAction: 'hide' }),
      });
      const n = r?.updated ?? selected.size;
      setSelected(new Set());
      flashRowMsg(`已隐藏 ${n} 篇 · 前台不再显示`);
      await loadPosts(type);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : '批量隐藏失败');
    } finally {
      setBatchBusy(false);
    }
  };

  const submitBatch = async () => {
    if (!selected.size || batchBusy) return;
    const addTags = beAddTags.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
    const removeTags = beRmTags.split(/[,，、\s]+/).map((s) => s.trim()).filter(Boolean);
    if (!beCatOn && !beChapOn && !addTags.length && !removeTags.length && !beHidden) {
      setBatchError('请至少勾选一项修改内容');
      return;
    }
    setBatchBusy(true);
    setBatchError('');
    try {
      const r = await api<{ updated: number; moved: { slug: string; from: string }[] }>(`/api/posts/batch?type=${type}`, {
        method: 'POST',
        body: JSON.stringify({
          action: 'update',
          slugs: [...selected],
          setCategory: beCatOn,
          category: beCat.trim(),
          setChapter: beChapOn,
          chapter: beChap.trim(),
          addTags,
          removeTags,
          hiddenAction: beHidden,
        }),
      });
      setBatchDone(
        `已更新 ${r.updated} 篇${r.moved?.length ? ` · 移动 ${r.moved.length} 篇（slug 已随目录变化）` : ''}`
      );
      setSelected(new Set());
      setBeCatOn(false);
      setBeCat('');
      setBeChapOn(false);
      setBeChap('');
      setBeAddTags('');
      setBeRmTags('');
      setBeHidden('');
      await loadPosts(type);
      setTimeout(() => setBatchOpen(false), 1200);
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : '批量修改失败');
    } finally {
      setBatchBusy(false);
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
          navList();
        }}
      />
    );
  }

  if (view === 'taxonomy') {
    return (
      <TaxonomyManager
        onBack={() => {
          navList();
        }}
      />
    );
  }

  if (view === 'appearance') {
    return (
      <AppearanceManager
        onBack={() => {
          navList();
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
              navView('editor');
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
              navView('taxonomy');
            }}
            className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent"
          >
            分类与标签
          </Link>
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              navView('appearance');
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

      {/* 视图切换：编辑表格 / 前端排列预览 */}
      <div className="mt-5 inline-flex items-center gap-1 rounded-xl border border-line bg-panel/40 p-1">
        <span className="mono-label px-2 text-[10px] text-ink-faint">视图</span>
        <button
          onClick={() => setListMode('table')}
          className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors ${
            listMode === 'table' ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          编辑列表
        </button>
        <button
          onClick={() => setListMode('preview')}
          title="模拟前端笔记页的排列（按年分组 + 日期排序 + 同日按标题）"
          className={`rounded-lg px-4 py-1.5 text-[13px] font-medium transition-colors ${
            listMode === 'preview' ? 'bg-accent text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          预览排列
        </button>
      </div>

      {listMode === 'preview' ? (
        <ListPreview
          posts={posts}
          typeLabel={TYPE_LABELS[type]}
          onEdit={(slug) => {
            setEditorTarget({ type, slug });
            navView('editor');
          }}
          onReorder={reorderPosts}
        />
      ) : (
        <div className="contents">
      {error && (
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-4 text-[14px] text-accent">
          {error}
        </div>
      )}

      {/* 筛选：关键词 + 分类 + 标签（仿前端笔记页） */}
      <div className="mt-6 rounded-2xl border border-line p-4">
        <div className="relative">
          <svg
            viewBox="0 0 24 24"
            className="absolute left-3.5 top-1/2 h-[16px] w-[16px] -translate-y-1/2 text-ink-faint"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.5 4.5" />
          </svg>
          <input
            type="search"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder={`搜索${TYPE_LABELS[type]}标题 / 摘要 / 标签…`}
            className="w-full rounded-xl border border-line bg-panel py-2.5 pl-10 pr-9 text-[14.5px] text-ink transition-all placeholder:text-ink-faint focus:border-accent/60 focus:outline-none"
          />
          {listQuery && (
            <button
              onClick={() => setListQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[15px] text-ink-faint transition-colors hover:text-accent"
              aria-label="清除搜索"
            >
              ×
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">分类</span>
          <FilterChip active={listCat === null} onClick={() => setListCat(null)}>
            {site.notesBrowser.all} {posts.length}
          </FilterChip>
          {listCats.map(([c, n]) => (
            <FilterChip
              key={c}
              active={listCat === c}
              onClick={() => {
                setListChapter(null);
                setListCat(listCat === c ? null : c);
              }}
            >
              {c} {n}
            </FilterChip>
          ))}
          {listCats.length === 0 && <span className="text-[12.5px] text-ink-faint">暂无分类</span>}
        </div>
        {/* 选中分类后联动显示该分类的章节（仿前端笔记页章节面板） */}
        {listCat && listChapters.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">章节</span>
            <FilterChip small active={listChapter === null} onClick={() => setListChapter(null)}>
              全部
            </FilterChip>
            {listChapters.map(([ch, n]) => (
              <FilterChip
                small
                key={ch}
                active={listChapter === ch}
                onClick={() => setListChapter(listChapter === ch ? null : ch)}
              >
                {ch} {n}
              </FilterChip>
            ))}
          </div>
        )}
        {listTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">标签</span>
            <FilterChip small active={listTag === null} onClick={() => setListTag(null)}>
              {site.notesBrowser.all}
            </FilterChip>
            {listTags.map((t) => (
              <FilterChip small key={t} active={listTag === t} onClick={() => setListTag(listTag === t ? null : t)}>
                {t}
              </FilterChip>
            ))}
          </div>
        )}
        {filterActive && (
          <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
            <span className="font-mono text-[12px] text-ink-faint">
              匹配 {filteredPosts.length} / {posts.length} 篇
            </span>
            <button
              onClick={() => {
                setListQuery('');
                setListCat(null);
                setListChapter(null);
                setListTag(null);
              }}
              className="text-[12.5px] font-medium text-accent transition-colors hover:text-accent-strong"
            >
              清除筛选
            </button>
          </div>
        )}
      </div>

      {/* 列表 */}
      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        {loading ? (
          <p className="px-6 py-14 text-center text-ink-faint">加载中…</p>
        ) : posts.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-faint">
            还没有{TYPE_LABELS[type]}，点击右上角「新建文章」开始创作。
          </p>
        ) : filteredPosts.length === 0 ? (
          <p className="px-6 py-14 text-center text-ink-faint">没有匹配「当前筛选」的{TYPE_LABELS[type]}。</p>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-line bg-panel/30 px-4 py-2">
              <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint uppercase">
                显示 {filteredPosts.length} / {posts.length}
              </span>
              <span className="font-mono text-[11px] tracking-[0.1em] text-ink-faint">
                按住 <span className="text-accent">SHIFT</span> 点击可连续多选
              </span>
            </div>
            {rowMsg && (
              <div className="flex items-center justify-between border-b border-line bg-accent/5 px-4 py-1.5">
                <span className="font-mono text-[12px] text-accent">{rowMsg}</span>
                <span className="font-mono text-[11px] text-ink-faint">点击行的「日期 / 分类」可直接修改</span>
              </div>
            )}
            <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="w-10 pl-5 pr-0 py-3.5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="全选"
                    className="h-4 w-4 cursor-pointer accent-accent"
                  />
                </th>
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
              {filteredPosts.map((p) => (
                <tr key={p.slug} className="border-b border-line/60 transition-colors last:border-0 hover:bg-accent/[0.04]">
                  <td className="pl-5 pr-0 py-3.5">
                    <input
                      type="checkbox"
                      checked={selected.has(p.slug)}
                      onClick={(e) => toggleSel(p.slug, e.shiftKey)}
                      onChange={() => {}}
                      aria-label={`选择 ${p.title || p.slug}`}
                      title={selected.has(p.slug) ? '取消选择（Shift 可连续多选）' : '选择（Shift 可连续多选）'}
                      className="h-4 w-4 cursor-pointer accent-accent"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => {
                        setEditorTarget({ type, slug: p.slug });
                        navView('editor');
                      }}
                      title="点击进入编辑"
                      className="block w-full max-w-md rounded px-1 -mx-1 py-0.5 text-left transition-colors hover:bg-accent/5"
                    >
                      <div className="flex items-center gap-2">
                        <div className="text-[15px] font-medium text-ink transition-colors group-hover:text-accent">
                          {p.title || p.slug}
                        </div>
                        {p.hidden && (
                          <span className="shrink-0 rounded border border-dashed border-ink-faint/60 px-1.5 py-0.5 font-mono text-[10px] tracking-[0.12em] text-ink-faint">
                            已隐藏
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 font-mono text-[11px] text-ink-faint">/{p.slug}</div>
                    </button>
                  </td>
                  <td className="hidden whitespace-nowrap px-4 py-3.5 md:table-cell">
                    {rowEdit?.slug === p.slug && rowEdit.field === 'date' ? (
                      <span className="inline-flex items-center gap-1">
                        <input
                          autoFocus
                          type="text"
                          defaultValue={p.date}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRowDate(p.slug, (e.target as HTMLInputElement).value);
                            else if (e.key === 'Escape') setRowEdit(null);
                          }}
                          onBlur={(e) => saveRowDate(p.slug, e.target.value)}
                          title="支持 2026/09/01 或 2026-09-01，Enter / 失焦保存"
                          style={{ width: '7.4rem' }}
                          className="rounded-md border border-line bg-panel px-2 py-1 font-mono text-[13px] text-ink outline-none focus:border-accent/60"
                        />
                        <button
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setRowEdit(null)}
                          title="取消"
                          className="px-1 text-[12px] text-ink-faint transition-colors hover:text-accent"
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setRowEdit({ slug: p.slug, field: 'date', draft: p.date })}
                        title="点击修改日期"
                        className="rounded px-1 py-0.5 font-mono text-[13px] text-ink-soft transition-colors hover:bg-accent/5 hover:text-accent"
                      >
                        {p.date}
                      </button>
                    )}
                  </td>
                  <td className="hidden px-4 py-3.5 md:table-cell">
                    {rowEdit?.slug === p.slug && rowEdit.field === 'category' ? (
                      <span className="inline-flex items-center gap-1">
                        <TaxonomySelect
                          variant="dropdown"
                          value={rowEdit.draft}
                          options={catCandidates}
                          onChange={(v) => setRowEdit({ slug: p.slug, field: 'category', draft: v })}
                          onPick={(v) => saveRowCategory(p.slug, v)}
                          placeholder="留空 = 移到未分类"
                          className="w-44"
                        />
                        {!catCandidates.includes(rowEdit.draft.trim()) && (
                          <button
                            type="button"
                            onClick={() => saveRowCategory(p.slug, rowEdit.draft)}
                            title="保存新分类"
                            className="rounded-md px-1.5 py-1 text-[13px] text-accent transition-colors hover:bg-accent/10"
                          >
                            ✓
                          </button>
                        )}
                        <button
                          onClick={() => setRowEdit(null)}
                          title="取消"
                          className="rounded-md px-1.5 py-1 text-[12px] text-ink-faint transition-colors hover:text-accent"
                        >
                          ✕
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setRowEdit({ slug: p.slug, field: 'category', draft: p.category || '' })}
                        title="点击修改分类"
                        className="max-w-full rounded px-1 py-0.5 transition-colors hover:bg-accent/5"
                      >
                        {p.category ? (
                          <span className="inline-block truncate rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-soft">
                            {p.category}
                            {p.chapter ? ` / ${p.chapter}` : ''}
                          </span>
                        ) : (
                          <span className="text-[12px] text-ink-faint">—</span>
                        )}
                      </button>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button
                      onClick={() => {
                        setEditorTarget({ type, slug: p.slug });
                        navView('editor');
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
          </>
        )}
        </div>
        </div>
      )}

      {/* ============ 批量导入弹窗（portal 到 body：页面进入动画容器带 transform，
          直接 fixed 会失效显示为虚影） ============ */}
      {bulkOpen &&
        createPortal(
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
                  将导入到：<span className="text-accent">{TYPE_LABELS[type]}</span> · 支持多选与拖拽，大类 / 章节 / 标签均可选可不选
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

            {/* 文件/文件夹选择 / 拖拽区 */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setBulkDrag(true);
              }}
              onDragLeave={() => setBulkDrag(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setBulkDrag(false);
                // 优先走 entries API：能识别拖进来的整个文件夹
                const picked = e.dataTransfer.items?.length
                  ? await readDropEntries(e.dataTransfer.items)
                  : Array.from(e.dataTransfer.files).map((file) => ({ file, relPath: file.name }));
                await addBulkFiles(picked);
              }}
              className={`mt-5 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${
                bulkDrag ? 'border-accent bg-accent/5' : 'border-line-strong'
              }`}
            >
              <p className="text-[14px] text-ink-soft">
                把 .md 文件或整个文件夹拖到这里（含图片的 Notion 导出直接拖文件夹），或
              </p>
              <div className="mt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => bulkInputRef.current?.click()}
                  disabled={bulkBusy}
                  className="rounded-xl px-5 py-2 text-[14px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  <span style={{ textShadow: 'none' }}>选择文件（可多选）</span>
                </button>
                <button
                  onClick={() => bulkDirInputRef.current?.click()}
                  disabled={bulkBusy}
                  className="rounded-xl border border-line px-5 py-2 text-[14px] font-medium text-ink transition-colors hover:border-accent/60 disabled:opacity-50"
                >
                  选择文件夹（md + 图片）
                </button>
              </div>
              <input ref={bulkInputRef} type="file" accept=".md,.mdx" multiple hidden onChange={onBulkSelect} />
              <input
                ref={bulkDirInputRef}
                type="file"
                multiple
                hidden
                {...({ webkitdirectory: 'true', directory: 'true' } as Record<string, string>)}
                onChange={onBulkSelect}
              />
              <p className="mt-3 text-[12px] text-ink-faint">
                文件夹里的图片会自动上传并替换 md 内引用路径，无需手动处理
              </p>
              {bulkImg && (
                <div className="mt-3">
                  <div className="mono-label !tracking-[0.1em] text-ink-soft">
                    IMAGE UPLOAD · {bulkImg.done} / {bulkImg.total}
                  </div>
                  <div className="mx-auto mt-2 h-1.5 w-48 overflow-hidden rounded-full bg-line/60">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{ width: `${bulkImg.total ? (bulkImg.done / bulkImg.total) * 100 : 0}%`, background: 'var(--accent)' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 已选文件列表 */}
            {bulkFiles.length > 0 && (
              <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-line">
                {bulkFiles.map((f, i) => (
                  <div key={`${f.relPath}-${i}`} className="flex items-center justify-between gap-3 border-b border-line/60 px-4 py-2.5 last:border-0">
                    <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{f.relPath}</span>
                    <button
                      onClick={() => setBulkFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="shrink-0 text-[13px] text-ink-faint transition-colors hover:text-accent"
                    >
                      移除
                    </button>
                  </div>
                ))}
                <div className="px-4 py-2 text-[12px] text-ink-faint">
                  共 {bulkFiles.length} 个 md · 已识别图片 {imageMapRef.current.size} 张
                </div>
              </div>
            )}

            {/* 大类 / 章节 / 标签（均可留空） */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                  统一大类（留空则保留文件原有分类）
                </label>
                <TaxonomySelect
                  variant="chips"
                  value={bulkCategory}
                  onChange={(v) => {
                    setBulkCategory(v);
                    if (v.trim() !== bulkCategory.trim()) setBulkChapter('');
                  }}
                  options={[
                    ...new Set([...bulkCats, ...posts.map((p) => p.category).filter((c): c is string => Boolean(c))]),
                  ]}
                  placeholder="如：WebGIS 开发"
                />
              </div>

              {bulkCategory.trim() && (
                <div>
                  <label className="mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                    归入章节（留空 = 不分章节；可直接输入新章节名）
                  </label>
                  <TaxonomySelect
                    variant="chips"
                    value={bulkChapter}
                    onChange={(v) => setBulkChapter(v)}
                    options={[
                       ...new Set([
                         ...(bulkChapters[bulkCategory.trim()] || []),
                         ...posts
                           .filter((p) => p.category === bulkCategory.trim())
                           .map((p) => p.chapter)
                           .filter((c): c is string => Boolean(c)),
                       ]),
                     ]}
                    placeholder={`如：01 环境配置（${bulkCategory.trim()} 下的章节）`}
                  />
                </div>
              )}

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
          </div>,
          document.body
        )}

      {/* ============ 批量操作浮动条（portal 到 body，避开 transform 祖先） ============ */}
      {selected.size > 0 &&
        createPortal(
          <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex flex-col items-center gap-2 px-4">
            {batchError && !batchOpen && (
              <div className="pointer-events-auto rounded-xl border border-accent/40 bg-panel-solid px-4 py-2 text-[13px] text-accent shadow-lg">
                {batchError}
              </div>
            )}
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-2xl border border-line bg-panel-solid px-4 py-3 shadow-2xl md:gap-3 md:px-5">
              <span className="font-mono text-[12px] tracking-[0.1em] text-ink-soft">
                已选 <span className="text-accent">{selected.size}</span> 篇
              </span>
              <button
                onClick={toggleAll}
                className="rounded-lg px-3 py-1.5 text-[13px] text-ink-soft transition-colors hover:text-accent"
              >
                {allSelected ? '取消全选' : '全选'}
              </button>
              <span className="h-5 w-px bg-line" />
              <button
                onClick={openBatch}
                disabled={batchBusy}
                className="rounded-lg border border-line px-4 py-1.5 text-[13.5px] font-medium text-ink transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
              >
                批量修改
              </button>
              <button
                onClick={batchHide}
                disabled={batchBusy}
                title="隐藏所选文章（前台不再显示，后台仍可恢复）"
                className="rounded-lg border border-dashed border-ink-faint/50 px-4 py-1.5 text-[13.5px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-50"
              >
                批量隐藏
              </button>
              <button
                onClick={batchDelete}
                disabled={batchBusy}
                className="rounded-lg px-4 py-1.5 text-[13.5px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                style={{ background: 'var(--accent)' }}
              >
                <span style={{ textShadow: 'none' }}>批量删除</span>
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="rounded-lg px-2 py-1.5 text-[15px] text-ink-faint transition-colors hover:text-accent"
                aria-label="取消选择"
              >
                ×
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* ============ 批量修改弹窗 ============ */}
      {batchOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => {
              if (!batchBusy) setBatchOpen(false);
            }}
          >
            <div
              className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-panel-solid p-6 shadow-2xl md:p-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">批量修改</h2>
                  <p className="mt-1.5 text-[13px] text-ink-soft">
                    将应用于选中的 <span className="text-accent">{selected.size}</span> 篇{TYPE_LABELS[type]}，勾选要修改的项
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (!batchBusy) setBatchOpen(false);
                  }}
                  className="rounded-lg px-2 py-1 text-[16px] text-ink-faint transition-colors hover:text-accent"
                >
                  ×
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {/* 大类 */}
                <div className={`rounded-xl border p-4 transition-colors ${beCatOn ? 'border-accent/50 bg-accent/[0.04]' : 'border-line'}`}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={beCatOn}
                      onChange={(e) => {
                        setBeCatOn(e.target.checked);
                        if (!e.target.checked) setBeChap('');
                      }}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-[14.5px] font-medium text-ink">修改大类</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">CATEGORY</span>
                  </label>
                  {beCatOn && (
                    <div className="mt-3 pl-7">
                      <TaxonomySelect
                        variant="chips"
                        value={beCat}
                        onChange={(v) => {
                          setBeCat(v);
                          if (v.trim() !== beCat.trim()) setBeChap('');
                        }}
                        onPick={() => setBeChap('')}
                        options={[
                          ...new Set([...bulkCats, ...posts.map((p) => p.category).filter((c): c is string => Boolean(c))]),
                        ]}
                        placeholder="留空 = 移到未分类（根目录）"
                      />
                    </div>
                  )}
                </div>

                {/* 章节 */}
                <div className={`rounded-xl border p-4 transition-colors ${beChapOn ? 'border-accent/50 bg-accent/[0.04]' : 'border-line'}`}>
                  <label className="flex cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      checked={beChapOn}
                      onChange={(e) => setBeChapOn(e.target.checked)}
                      className="h-4 w-4 accent-accent"
                    />
                    <span className="text-[14.5px] font-medium text-ink">修改章节</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">CHAPTER</span>
                  </label>
                  {beChapOn && (
                    <div className="mt-3 pl-7">
                      <TaxonomySelect
                        variant="chips"
                        value={beChap}
                        onChange={(v) => setBeChap(v)}
                        options={[
                          ...new Set([
                            ...(beCatOn && beCat.trim() ? bulkChapters[beCat.trim()] || [] : Object.values(bulkChapters).flat()),
                          ]),
                        ]}
                        placeholder={beCatOn && beCat.trim() ? `如：01 环境配置（${beCat.trim()} 下）` : '留空 = 移出章节'}
                        hint={
                          beCatOn
                            ? '按新大类落位；未勾选「修改大类」时按各文章现有大类归入同名章节'
                            : '按各文章现有大类归入同名章节'
                        }
                      />
                    </div>
                  )}
                </div>

                {/* 加标签 */}
                <div className="rounded-xl border border-line p-4">
                  <label className="flex items-center gap-3">
                    <span className="text-[14.5px] font-medium text-ink">追加标签</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">TAGS +</span>
                  </label>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={beAddTags}
                      onChange={(e) => setBeAddTags(e.target.value)}
                      placeholder="逗号分隔，追加到每篇文章（不勾选任何项时此项生效）"
                      className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none"
                    />
                  </div>
                </div>

                {/* 移除标签 */}
                <div className="rounded-xl border border-line p-4">
                  <label className="flex items-center gap-3">
                    <span className="text-[14.5px] font-medium text-ink">移除标签</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">TAGS −</span>
                  </label>
                  <div className="mt-3">
                    <input
                      type="text"
                      value={beRmTags}
                      onChange={(e) => setBeRmTags(e.target.value)}
                      placeholder="逗号分隔，从每篇文章移除"
                      className="w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none"
                    />
                    {selectedTags.length > 0 && (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {selectedTags.map((t) => (
                          <button
                            key={t}
                            onClick={() => setBeRmTags((prev) => (prev ? `${prev}, ${t}` : t) || '')}
                            className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-faint transition-colors hover:border-accent/50 hover:text-accent"
                          >
                            − {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* 隐藏 / 恢复显示 */}
                <div className="rounded-xl border border-line p-4">
                  <label className="flex items-center gap-3">
                    <span className="text-[14.5px] font-medium text-ink">隐藏 / 显示</span>
                    <span className="ml-auto font-mono text-[11px] text-ink-faint">HIDDEN</span>
                  </label>
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {(
                        [
                          ['', '不修改', '保持文章当前状态'],
                          ['hide', '隐藏', '前台不再显示（后台仍可见、可恢复）'],
                          ['show', '恢复显示', '取消隐藏，前台重新可见'],
                        ] as const
                      ).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setBeHidden(val)}
                          className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                            beHidden === val
                              ? 'bg-accent text-white'
                              : 'border border-line text-ink-soft hover:border-accent/50 hover:text-accent'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <p className="mt-2 font-mono text-[11px] text-ink-faint">
                      {beHidden === 'hide'
                        ? '将所选文章标记为隐藏（frontmatter hidden: true），前台列表与直链都不再显示'
                        : beHidden === 'show'
                          ? '清除所选文章的隐藏标记'
                          : '默认：不对隐藏状态做任何改动'}
                    </p>
                  </div>
                </div>
              </div>

              {batchError && (
                <div className="mt-4 rounded-xl border border-accent/40 bg-accent/5 px-4 py-3 text-[13.5px] text-accent">{batchError}</div>
              )}
              {batchDone && (
                <div className="mt-4 rounded-xl border border-line bg-panel px-4 py-3 text-[13.5px] text-ink-soft">{batchDone}</div>
              )}

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  onClick={() => setBatchOpen(false)}
                  disabled={batchBusy}
                  className="rounded-xl border border-line px-5 py-2.5 text-[15px] font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
                >
                  关闭
                </button>
                <button
                  onClick={submitBatch}
                  disabled={batchBusy}
                  className="rounded-xl px-6 py-2.5 text-[15px] font-semibold text-white transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
                  style={{ background: 'var(--accent)' }}
                >
                  <span style={{ textShadow: 'none' }}>{batchBusy ? '应用中…' : `应用到 ${selected.size} 篇`}</span>
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
