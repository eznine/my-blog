'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { renderMarkdown } from '@/lib/md';
import { TaxonomySelect } from './taxonomy-select';
import {
  api,
  uploadImage,
  TYPE_LABELS,
  type PostType,
  type Taxonomy,
} from './api';

interface Props {
  type: PostType;
  slug: string | null;
  prefill?: { meta: Record<string, unknown>; content: string };
  onBack: () => void;
}

interface FormState {
  title: string;
  date: string;
  summary: string;
  category: string;
  chapter: string;
  tags: string[];
  status: string;
  tech: string[];
  demo: string;
  github: string;
  slug: string;
  content: string;
}

const EMPTY: FormState = {
  title: '',
  date: new Date().toISOString().slice(0, 10),
  summary: '',
  category: '',
  chapter: '',
  tags: [],
  status: '',
  tech: [],
  demo: '',
  github: '',
  slug: '',
  content: '',
};

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

export function PostEditor({ type, slug, prefill, onBack }: Props) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [taxonomy, setTaxonomy] = useState<Taxonomy | null>(null);
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isEdit = !!slug;

  /* ---- 加载：编辑已有 / 导入预填 / 新建 ---- */
  useEffect(() => {
    api<Taxonomy>('/api/taxonomy').then(setTaxonomy).catch(() => {});
    if (!slug) {
      if (prefill) {
        const m = prefill.meta;
        setForm({
          ...EMPTY,
          title: str(m.title),
          date: str(m.date) || EMPTY.date,
          summary: str(m.summary),
          category: str(m.category),
          chapter: str(m.chapter),
          tags: arr(m.tags),
          status: str(m.status),
          tech: arr(m.tech),
          demo: str(m.demo),
          github: str(m.github),
          content: prefill.content.replace(/^\n+/, ''),
        });
      }
      return;
    }
    setLoading(true);
    api<{ meta: Record<string, unknown>; content: string }>(
      `/api/post?type=${type}&slug=${encodeURIComponent(slug)}`
    )
      .then(({ meta, content }) => {
        setForm({
          ...EMPTY,
          title: str(meta.title),
          date: str(meta.date) || EMPTY.date,
          summary: str(meta.summary),
          category: str(meta.category),
          chapter: str(meta.chapter),
          tags: arr(meta.tags),
          status: str(meta.status),
          tech: arr(meta.tech),
          demo: str(meta.demo),
          github: str(meta.github),
          slug,
          content: content.replace(/^\n+/, ''),
        });
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'))
      .finally(() => setLoading(false));
  }, [type, slug, prefill]);

  /* ---- 预览（防抖） ---- */
  useEffect(() => {
    clearTimeout(previewTimer.current);
    previewTimer.current = setTimeout(() => {
      renderMarkdown(form.content || '（空）').then(setPreview).catch(() => setPreview(''));
    }, 350);
    return () => clearTimeout(previewTimer.current);
  }, [form.content]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  /* ---- 标签 ---- */
  const allTagSuggestions = useMemo(() => {
    const s = new Set<string>(taxonomy?.tags || []);
    form.tags.forEach((t) => s.delete(t));
    return [...s].slice(0, 12);
  }, [taxonomy, form.tags]);

  const addTag = (t: string) => {
    const v = t.trim().replace(/,$/, '');
    if (!v || form.tags.includes(v)) return;
    set('tags', [...form.tags, v]);
    setTagInput('');
  };

  /* ---- 文本插入工具 ---- */
  const insert = (before: string, after = '', placeholder = '') => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const sel = value.slice(s, e) || placeholder;
    const next = value.slice(0, s) + before + sel + after + value.slice(e);
    set('content', next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = s + before.length;
      ta.selectionEnd = s + before.length + sel.length;
    });
  };

  const insertLine = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const { selectionStart: s, value } = ta;
    const lineStart = value.lastIndexOf('\n', Math.max(0, s - 1)) + 1;
    const next = value.slice(0, lineStart) + text + '\n' + value.slice(lineStart);
    set('content', next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = lineStart + text.length + 1;
    });
  };

  /* ---- 图片上传（按钮 / 拖拽 / 粘贴共用） ---- */
  const uploadAndInsert = async (files: File[]) => {
    const imgs = files.filter((f) => /^image\//.test(f.type));
    if (!imgs.length || uploading) return;
    setUploading(true);
    setError('');
    try {
      for (const file of imgs) {
        const url = await uploadImage(file);
        insert(`\n![${form.title || file.name}](${url})\n`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const onImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    await uploadAndInsert(files);
  };

  const onPaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.clipboardData.files || []);
    if (files.length) {
      e.preventDefault();
      await uploadAndInsert(files);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length) {
      e.preventDefault();
      await uploadAndInsert(files);
    }
  };

  /* ---- 保存：标题可留空（自动取正文一级标题，再无则「未命名」） ---- */
  const save = async () => {
    setSaving(true);
    setError('');
    setSaved('');
    const autoTitle =
      form.title.trim() || form.content.match(/^#\s+(.+)$/m)?.[1]?.trim() || '';
    try {
      const payload = {
        title: autoTitle,
        date: form.date,
        summary: form.summary,
        category: form.category.trim(),
        chapter: form.category.trim() ? form.chapter.trim() : '',
        tags: form.tags,
        status: form.status,
        tech: form.tech,
        demo: form.demo,
        github: form.github,
        content: form.content,
      };
      const r = isEdit
        ? await api<{ slug: string }>(`/api/posts?type=${type}`, {
            method: 'PUT',
            body: JSON.stringify({ ...payload, slug, newSlug: form.slug }),
          })
        : await api<{ slug: string }>(`/api/posts?type=${type}`, {
            method: 'POST',
            body: JSON.stringify({ ...payload, slug: form.slug || autoTitle }),
          });
      setSaved(`已保存 · /${type === 'notes' ? 'notes' : type}/${r.slug}`);
      if (!isEdit) window.history.replaceState(null, '', `/admin`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-xl border border-line bg-panel px-4 py-2.5 text-[15px] text-ink transition-all focus:border-accent/60 focus:outline-none';
  const labelCls = 'mb-1.5 block font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase';

  const categoryOptions = taxonomy?.categories?.[type] || [];
  const chapterOptions = (form.category.trim() && taxonomy?.chapters?.[form.category.trim()]) || [];

  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-10 md:pt-14">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="mono-label flex items-center gap-2.5 !text-accent">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            {TYPE_LABELS[type]} · {isEdit ? '编辑' : '新建'}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-ink">
            {isEdit ? '编辑文章' : '写点新东西'}
          </h1>
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
        <div className="mt-6 rounded-xl border border-accent/40 bg-accent/5 px-5 py-3.5 text-[14px] text-accent">
          {error}
        </div>
      )}
      {saved && (
        <div className="mt-6 rounded-xl border border-line bg-panel px-5 py-3.5 font-mono text-[13px] text-ink-soft">
          {saved}
        </div>
      )}

      {loading ? (
        <p className="py-20 text-center text-ink-faint">加载中…</p>
      ) : (
        <>
          {/* ============ 元信息 ============ */}
          <div className="mt-8 grid gap-5 rounded-2xl border border-line p-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="md:col-span-2">
              <label className={labelCls}>标题 Title</label>
              <input
                className={inputCls}
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="可留空：自动取正文一级标题 / 文件名"
              />
            </div>
            <div>
              <label className={labelCls}>日期 Date</label>
              <input type="date" className={inputCls} value={form.date} onChange={(e) => set('date', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>大类 Category</label>
              <TaxonomySelect
                variant="dropdown"
                value={form.category}
                onChange={(v) => {
                  set('category', v);
                  if (v.trim() !== form.category.trim()) set('chapter', '');
                }}
                onPick={() => set('chapter', '')}
                options={categoryOptions}
                placeholder="选择或输入大类"
              />
            </div>
            <div>
              <label className={labelCls}>章节 Chapter</label>
              <TaxonomySelect
                variant="dropdown"
                value={form.chapter}
                onChange={(v) => set('chapter', v)}
                options={chapterOptions}
                placeholder={form.category.trim() ? '如：01 环境配置（可留空）' : '先选大类，再选章节'}
                disabled={!form.category.trim()}
              />
            </div>

            {type === 'research' && (
              <div>
                <label className={labelCls}>状态 Status</label>
                <TaxonomySelect
                  variant="dropdown"
                  value={form.status}
                  onChange={(v) => set('status', v)}
                  options={['进行中', '已完成', '已发表']}
                  placeholder="进行中 / 已完成 / 已发表"
                />
              </div>
            )}

            {type === 'projects' && (
              <>
                <div>
                  <label className={labelCls}>技术栈 Tech</label>
                  <input
                    className={inputCls}
                    value={form.tech.join(', ')}
                    onChange={(e) => set('tech', e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))}
                    placeholder="逗号分隔，如 MapLibre, React"
                  />
                </div>
                <div>
                  <label className={labelCls}>演示地址 Demo</label>
                  <input className={inputCls} value={form.demo} onChange={(e) => set('demo', e.target.value)} placeholder="https://" />
                </div>
                <div>
                  <label className={labelCls}>GitHub</label>
                  <input className={inputCls} value={form.github} onChange={(e) => set('github', e.target.value)} placeholder="https://github.com/…" />
                </div>
              </>
            )}

            <div className={type === 'notes' ? 'md:col-span-2' : ''}>
              <label className={labelCls}>链接 Slug（URL 标识）</label>
              <input
                className={`${inputCls} font-mono text-[13px]`}
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                placeholder={isEdit ? slug : '留空则按标题自动生成'}
                disabled={!isEdit && !!prefill}
              />
              <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
                仅小写字母、数字与连字符；中文会被转写
              </p>
            </div>

            <div className="md:col-span-2 lg:col-span-2">
              <label className={labelCls}>标签 Tags</label>
              <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2">
                {form.tags.map((t) => (
                  <span key={t} className="flex items-center gap-1.5 rounded-lg border border-accent/40 px-2.5 py-1 text-[13px] text-accent">
                    {t}
                    <button onClick={() => set('tags', form.tags.filter((x) => x !== t))} className="text-accent/60 hover:text-accent">
                      ×
                    </button>
                  </span>
                ))}
                <input
                  className="min-w-[110px] flex-1 bg-transparent py-1 text-[14px] text-ink focus:outline-none"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addTag(tagInput);
                    } else if (e.key === 'Backspace' && !tagInput && form.tags.length) {
                      set('tags', form.tags.slice(0, -1));
                    }
                  }}
                  placeholder="输入后回车添加"
                />
              </div>
              {allTagSuggestions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {allTagSuggestions.map((t) => (
                    <button
                      key={t}
                      onClick={() => addTag(t)}
                      className="rounded-md border border-line px-2 py-0.5 text-[12px] text-ink-faint transition-colors hover:border-accent/50 hover:text-accent"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="md:col-span-2 lg:col-span-4">
              <label className={labelCls}>摘要 Summary</label>
              <textarea
                className={`${inputCls} min-h-[64px] resize-y`}
                value={form.summary}
                onChange={(e) => set('summary', e.target.value)}
                placeholder="列表页与搜索里显示的一句话摘要"
              />
            </div>
          </div>

          {/* ============ 编辑器 ============ */}
          <div className="mt-6 overflow-hidden rounded-2xl border border-line">
            {/* 工具栏 */}
            <div className="flex flex-wrap items-center gap-1 border-b border-line bg-panel px-3 py-2">
              {[
                { label: 'H2', fn: () => insertLine('## ') },
                { label: 'H3', fn: () => insertLine('### ') },
                { label: 'B', fn: () => insert('**', '**', '粗体') },
                { label: 'I', fn: () => insert('*', '*', '斜体') },
                { label: '行代码', fn: () => insert('`', '`', 'code') },
                { label: '代码块', fn: () => insert('\n```js\n', '\n```\n', '// 代码') },
                { label: '链接', fn: () => insert('[', '](https://)', '链接文字') },
                { label: '引用', fn: () => insertLine('> ') },
                { label: '表格', fn: () => insert('\n| 列 A | 列 B |\n| --- | --- |\n|  |  |\n', '', '') },
                { label: '分割线', fn: () => insertLine('\n---\n') },
              ].map((b) => (
                <button
                  key={b.label}
                  onClick={b.fn}
                  className="rounded-lg px-3 py-1.5 font-mono text-[12px] text-ink-soft transition-colors hover:bg-accent/10 hover:text-accent"
                >
                  {b.label}
                </button>
              ))}
              <span className="mx-1 h-4 w-px bg-line" />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-lg px-3 py-1.5 font-mono text-[12px] text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
              >
                {uploading ? '上传中…' : '图片 ↑'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={onImage} />
              <div className="ml-auto flex items-center gap-3">
                <span className="font-mono text-[11px] text-ink-faint">
                  {form.content.length} 字符
                </span>
                <button
                  onClick={() => setShowPreview((v) => !v)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-[12px] transition-colors ${
                    showPreview ? 'bg-accent/10 text-accent' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  预览 {showPreview ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div className={`grid ${showPreview ? 'lg:grid-cols-2' : ''}`}>
              <textarea
                ref={textareaRef}
                value={form.content}
                onChange={(e) => set('content', e.target.value)}
                onPaste={onPaste}
                onDrop={onDrop}
                spellCheck={false}
                placeholder="# 在这里用 Markdown 写正文…&#10;&#10;支持代码块、表格、图片（工具栏上传 / 直接拖入 / 粘贴截图）等。"
                className="min-h-[60vh] w-full resize-y bg-transparent px-6 py-5 font-mono text-[14px] leading-[1.75] text-ink focus:outline-none"
              />
              {showPreview && (
                <div className="max-h-none overflow-auto border-t border-line bg-panel/40 px-6 py-5 lg:max-h-[80vh] lg:border-l lg:border-t-0">
                  <div className="mb-3 font-mono text-[11px] tracking-[0.16em] text-ink-faint uppercase">
                    Preview · 实时预览
                  </div>
                  <div className="md-body" dangerouslySetInnerHTML={{ __html: preview }} />
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
