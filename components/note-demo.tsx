'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { html } from '@codemirror/lang-html';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { keymap, EditorView } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';

/** 右侧演示栏挂载点（portal 到 document.body，避免 transform 祖先破坏 fixed） */
export const DEMO_SIDEBAR_ID = 'note-demo-sidebar';
/** 文章页最外层容器：打开演示模式时挂 data-demo="open"，CSS 据此隐藏目录 / 放宽宽度 */
export const DEMO_PAGE_ID = 'demo-page';

export interface DemoSpec {
  src: string;
  label?: string;
  height?: number;
}

/** 外链（https/协议相对/data:）跨域读不到源码，不提供代码编辑 */
const EXTERNAL_SRC = /^(https?:|\/\/|data:)/;

/** srcdoc 没有真实 URL：往 <head> 里插 <base>，让 lib/... 等相对路径仍解析到 demo 目录 */
function withBase(html: string, root: string): string {
  const base = `<base href="${root}">`;
  const head = html.match(/<head[^>]*>/i);
  if (head && head.index != null) {
    return html.slice(0, head.index + head[0].length) + base + html.slice(head.index + head[0].length);
  }
  return base + html;
}

/** 编辑器按需加载：只在点开「编辑代码」时才下载 CodeMirror，不拖慢笔记页 */
const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="demo-code-loading">加载编辑器…</div>,
});

/** 主题跟随全站代码块配色（CSS 变量，深浅主题即时生效）——VSCode 式语法高亮 */
const demoTheme = EditorView.theme(
  {
    '&': { backgroundColor: 'var(--code-bg)', color: 'var(--code-ink)', fontSize: '12px' },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, monospace)',
      lineHeight: '1.65',
    },
    '.cm-content': { padding: '0.6rem 0', caretColor: 'var(--accent)' },
    '&.cm-focused': { outline: 'none' },
    '.cm-cursor': { borderLeftColor: 'var(--accent)' },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground': {
      backgroundColor: 'var(--accent-glow) !important',
    },
    '.cm-gutters': {
      backgroundColor: 'transparent',
      color: 'var(--code-ink)',
      opacity: 0.4,
      borderRight: '1px solid rgba(232, 224, 204, 0.12)',
    },
    '.cm-activeLine': { backgroundColor: 'rgba(255, 255, 255, 0.04)' },
    '.cm-activeLineGutter': { backgroundColor: 'transparent' },
  },
  { dark: true }
);

/** 高亮配色复用全站代码高亮变量：关键字橙红 / 字符串米金 / 注释灰 / 数字浅橙 / 属性浅米 / 函数绿 */
const demoHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: 'var(--hl-keyword)' },
  { tag: tags.string, color: 'var(--hl-string)' },
  { tag: tags.comment, color: 'var(--hl-comment)', fontStyle: 'italic' },
  { tag: tags.number, color: 'var(--hl-number)' },
  { tag: tags.attributeName, color: 'var(--hl-attr)' },
  { tag: [tags.tagName, tags.bracket, tags.angleBracket], color: 'var(--hl-keyword)' },
  { tag: tags.function(tags.variableName), color: 'var(--hl-func)' },
  { tag: tags.meta, color: 'var(--hl-comment)' },
]);

/**
 * 笔记演示入口：标题右侧「运行 DEMO」→ 进入演示模式。
 * 演示栏 portal 到 document.body 并 position:fixed（桌面右半屏 50%，<768px 全屏），
 * 永不跟随页面滚动；左侧文章独立滚动。再点「关闭 DEMO」还原。
 * iframe 首次打开才挂载 src（关闭再开重新加载，状态重置）。
 * 「编辑代码」：同源 demo 读取源码 → CodeMirror 高亮编辑 → 点「运行」用 srcdoc 当场看效果；
 * 编辑区与预览 iframe 之间可上下拖动分隔条调比例；全程不写文件，外链 demo 不显示该按钮。
 */
export function NoteDemo({ demo }: { demo: DemoSpec }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<HTMLElement | null>(null);

  // —— 代码编辑（练习用）：读源码 → 改 → 运行，仅当场生效、不保存 ——
  const editable = !EXTERNAL_SRC.test(demo.src);
  const [editing, setEditing] = useState(false);
  const [original, setOriginal] = useState('');
  const [code, setCode] = useState('');
  const [liveDoc, setLiveDoc] = useState<string | null>(null);
  const [fetchState, setFetchState] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [dragging, setDragging] = useState(false);
  const fetchedRef = useRef(false);
  const runRef = useRef<() => void>(() => {});
  const editorRef = useRef<HTMLDivElement | null>(null);
  const edHRef = useRef<number | null>(null); // 拖拽过的编辑区高度（会话内保持）
  const dragRef = useRef<{ startY: number; startH: number; barH: number } | null>(null);
  const splitWRef = useRef<number | null>(null); // 左右分栏：右侧面板宽度 px（--demo-split 同时驱动文章留白）
  const dragVRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    setBody(document.body);
  }, []);

  // 演示模式：给最外层容器挂 data-demo，CSS 负责隐藏目录 / 正文留白
  useEffect(() => {
    const page = document.getElementById(DEMO_PAGE_ID);
    if (page) page.dataset.demo = open ? 'open' : '';
  }, [open]);

  // 左右分栏比例：--demo-split 打在 <html> 上（面板 portal 到 body，需共同祖先），
  // 左侧文章 .demo-panel-row padding-right 与右侧面板宽度共用一个变量 → 拖动即联动
  useEffect(() => {
    const root = document.documentElement;
    if (!open) {
      root.style.removeProperty('--demo-split');
      return;
    }
    if (splitWRef.current == null) {
      splitWRef.current = Math.round((window.innerWidth ?? 872) * 0.5);
    }
    root.style.setProperty('--demo-split', `${splitWRef.current}px`);
  }, [open]);

  // 收起再展开编辑器时恢复上次拖拽过的高度
  useLayoutEffect(() => {
    if (editing && editorRef.current && edHRef.current) {
      editorRef.current.style.height = `${edHRef.current}px`;
    }
  }, [editing]);

  // 首次展开编辑器时拉取 demo 源码（同源；外链已由 editable 排除，失败仍可手贴内容）
  useEffect(() => {
    if (!editing || fetchedRef.current) return;
    fetchedRef.current = true;
    setFetchState('loading');
    fetch(demo.src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const text = await r.text();
        setOriginal(text);
        setCode(text);
        setFetchState('ok');
      })
      .catch(() => setFetchState('error'));
  }, [editing, demo.src]);

  // demo 所在目录（去掉文件名），作为 srcdoc 里相对路径的基准
  const baseRoot = demo.src.slice(0, demo.src.lastIndexOf('/') + 1);

  function applyRun(doc: string) {
    if (!doc.trim()) return;
    setLiveDoc(withBase(doc, baseRoot));
  }

  const applyRunCode = () => applyRun(code);
  runRef.current = applyRunCode; // 供 CodeMirror 快捷键（稳定引用）调用

  function resetCode() {
    if (!original) return;
    setCode(original);
    applyRun(original);
  }

  // —— 上下拖动分隔条：调节「代码区 / 下方展示区」比例 ——
  // setPointerCapture 把指针锁在分隔条上：鼠标移进 iframe 区域也不会丢事件，拖动全程跟手
  function onResizerPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    const editor = editorRef.current;
    if (!editor) return;
    e.preventDefault();
    const wrap = editor.parentElement;
    if (!wrap) return;
    const barH = wrap.querySelector('.demo-frame-bar')?.getBoundingClientRect().height ?? 44;
    const minH = 90;
    dragRef.current = { startY: e.clientY, startH: editor.offsetHeight, barH };
    setDragging(true);
    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    try {
      el.setPointerCapture(e.pointerId); // 关键：捕获后 pointermove/up 都归分隔条收（跨 iframe 也有效）
    } catch {
      /* pointerId 异常时忽略 */
    }
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const maxH = Math.max(minH, wrap.clientHeight - d.barH - 120); // 下方 iframe 至少留 120px
      const h = Math.min(maxH, Math.max(minH, d.startH + (ev.clientY - d.startY)));
      editor.style.height = `${h}px`;
      edHRef.current = h;
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  }

  // —— 左右分栏拖动条：调节「左侧文章 / 右侧演示区」比例 ——
  // 同样 setPointerCapture 锁指针（跨 iframe 跟手）；直接用 DOM 写 --demo-split，拖动不触发 React 重渲染
  function onVSplitPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if ((window.innerWidth || 0) < 768) return; // 移动端整屏无分栏
    e.preventDefault();
    const sidebar = el.closest('#note-demo-sidebar') as HTMLElement | null;
    if (!sidebar) return;
    const root = document.documentElement;
    dragVRef.current = { startX: e.clientX, startW: sidebar.getBoundingClientRect().width };
    if (splitWRef.current == null) splitWRef.current = Math.round((window.innerWidth || 872) * 0.5);
    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* pointerId 异常时忽略 */
    }
    const onMove = (ev: PointerEvent) => {
      const d = dragVRef.current;
      if (!d) return;
      const iw = window.innerWidth || 872;
      const maxW = Math.max(320, iw - 360); // 左侧文章至少留 360px
      const w = Math.min(maxW, Math.max(320, d.startW + (d.startX - ev.clientX)));
      splitWRef.current = Math.round(w);
      root.style.setProperty('--demo-split', `${splitWRef.current}px`);
    };
    const onUp = () => {
      dragVRef.current = null;
      setDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
  }

  // CodeMirror：HTML 语言 + 高亮 + Tab 缩进 + Ctrl/⌘+Enter 直接运行
  const extensions = useMemo(
    () => [
      html(),
      syntaxHighlighting(demoHighlight),
      keymap.of([
        { key: 'Mod-Enter', run: () => { runRef.current(); return true; } },
        indentWithTab,
      ]),
    ],
    []
  );
  const onCodeChange = useCallback((v: string) => setCode(v), []);

  const label = demo.label || 'DEMO';

  return (
    <>
      {/* 标题右侧开关按钮：明显 CTA + 强呼吸圆点 */}
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="demo-toggle">
        <span className="demo-live-dot" aria-hidden="true" />
        {open ? '关闭 DEMO' : '运行 DEMO'}
      </button>

      {/* 演示栏：portal 到 body（避开 page-enter 的 transform 祖先，保证 fixed 生效），桌面右半 50% / 手机全屏 */}
      {open &&
        body &&
        createPortal(
          <div id={DEMO_SIDEBAR_ID} className={`demo-frame-wrap${dragging ? ' demo-dragging' : ''}`}>
            {/* 左右分栏拖动条：文末 | 演示面板（移动端整屏隐藏） */}
            <div
              className={`demo-colsplit-resizer${dragging ? ' is-dragging' : ''}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="拖动调节文章与演示区左右比例"
              onPointerDown={onVSplitPointerDown}
            />
            <div className="demo-frame-bar">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="demo-frame-bar-dot" aria-hidden="true" />
                <span className="truncate font-mono text-[13px] font-bold tracking-[0.16em] text-accent">
                  {label}
                </span>
              </div>
              <div className="flex flex-none items-center gap-2.5">
                {editable && (
                  <button
                    type="button"
                    aria-pressed={editing}
                    onClick={() => setEditing((v) => !v)}
                    className="demo-frame-bar-btn"
                  >
                    {editing ? '收起编辑器' : '编辑代码'}
                  </button>
                )}
                <a href={demo.src} target="_blank" rel="noreferrer" className="demo-frame-bar-btn">
                  新窗口打开 ↗
                </a>
                <button type="button" onClick={() => setOpen(false)} className="demo-frame-bar-btn">
                  ✕ 关闭
                </button>
              </div>
            </div>

            {/* 代码编辑区：改源码 → 运行，当场看效果，不落盘（CodeMirror 高亮，可拖分隔条调高度） */}
            {editing && (
              <div className="demo-code-editor" ref={editorRef}>
                <div className="demo-code-editor-bar">
                  <span className="demo-code-editor-tag">SOURCE · index.html</span>
                  <div className="demo-code-editor-actions">
                    <button
                      type="button"
                      className="demo-frame-bar-btn demo-code-run"
                      onClick={() => applyRunCode()}
                      disabled={fetchState === 'loading'}
                    >
                      运行 ▸
                    </button>
                    <button type="button" className="demo-frame-bar-btn" onClick={resetCode} disabled={!original}>
                      重置
                    </button>
                  </div>
                </div>
                {fetchState === 'error' && (
                  <div className="demo-code-error">未能读取源码（外链 / 跨域），可直接粘贴内容后点「运行」</div>
                )}
                <div className="demo-code-cm">
                  <CodeMirror
                    value={code}
                    onChange={onCodeChange}
                    extensions={extensions}
                    theme={demoTheme}
                    height="100%"
                    basicSetup={{ foldGutter: false }}
                  />
                </div>
              </div>
            )}
            {editing && (
              <div
                className={`demo-code-resizer${dragging ? ' is-dragging' : ''}`}
                role="separator"
                aria-orientation="horizontal"
                aria-label="拖动调节代码区与展示区比例"
                onPointerDown={onResizerPointerDown}
              >
                <span className="demo-code-resizer-grip" aria-hidden="true" />
              </div>
            )}

            <iframe
              title={label}
              src={liveDoc ? undefined : demo.src}
              srcDoc={liveDoc ?? undefined}
              className="demo-frame block w-full border-0 bg-white"
              loading="lazy"
            />
          </div>,
          body
        )}
    </>
  );
}