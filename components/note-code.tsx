'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { css } from '@codemirror/lang-css';
import { html } from '@codemirror/lang-html';
import { StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { shell } from '@codemirror/legacy-modes/mode/shell';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { DEMO_PAGE_ID, demoTheme, demoHighlight } from './note-demo';

export const CODE_SIDEBAR_ID = 'note-code-sidebar';
const CODE_SPLIT_VAR = '--code-split';

export interface CodeSpec {
  src: string;
  fileName: string;
  label?: string;
}

const CodeMirror = dynamic(() => import('@uiw/react-codemirror'), {
  ssr: false,
  loading: () => <div className="demo-code-loading">加载编辑器…</div>,
});

function langForFileName(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'py':
      return python();
    case 'sh':
    case 'bash':
    case 'zsh':
      return StreamLanguage.define(shell);
    case 'js':
    case 'mjs':
    case 'cjs':
    case 'jsx':
    case 'ts':
    case 'tsx':
      return javascript();
    case 'css':
    case 'scss':
    case 'less':
      return css();
    case 'html':
    case 'htm':
      return html();
    default:
      return [];
  }
}

export function NoteCode({ code }: { code: CodeSpec }) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState<HTMLElement | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [copied, setCopied] = useState(false);
  const [dragging, setDragging] = useState(false);
  const splitWRef = useRef<number | null>(null);
  const dragVRef = useRef<{ startX: number; startW: number } | null>(null);

  useEffect(() => {
    setBody(document.body);
  }, []);

  // 代码面板与 Demo 共用文章页容器：打开时挂 data-code，CSS 负责隐藏目录 / 正文留白
  useEffect(() => {
    const page = document.getElementById(DEMO_PAGE_ID);
    if (page) page.dataset.code = open ? 'open' : '';
  }, [open]);

  // 左右分栏比例：--code-split 打在 <html> 上，文章留白与代码面板宽度共用
  useEffect(() => {
    const root = document.documentElement;
    if (!open) {
      root.style.removeProperty(CODE_SPLIT_VAR);
      return;
    }
    if (splitWRef.current == null) {
      splitWRef.current = Math.round((window.innerWidth ?? 872) * 0.5);
    }
    root.style.setProperty(CODE_SPLIT_VAR, `${splitWRef.current}px`);
  }, [open]);

  useEffect(() => {
    if (!open || status !== 'idle') return;
    setStatus('loading');
    fetch(code.src)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setText(await r.text());
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, [open, status, code.src]);

  const extensions = useMemo(
    () => [
      langForFileName(code.fileName),
      syntaxHighlighting(demoHighlight),
      EditorState.readOnly.of(true),
      EditorView.editable.of(false),
    ],
    [code.fileName]
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* 剪贴板被浏览器拒绝时保持静默 */
    }
  }, [text]);

  // 与 Demo 一致的左右分栏拖动条：调节「左侧文章 / 右侧代码区」比例
  function onVSplitPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if ((window.innerWidth || 0) < 768) return; // 移动端全屏无分栏
    e.preventDefault();
    const sidebar = el.closest(`#${CODE_SIDEBAR_ID}`) as HTMLElement | null;
    if (!sidebar) return;
    const root = document.documentElement;
    dragVRef.current = { startX: e.clientX, startW: sidebar.getBoundingClientRect().width };
    if (splitWRef.current == null) splitWRef.current = Math.round((window.innerWidth || 872) * 0.5);
    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    try {
      el.setPointerCapture(e.pointerId); // 锁指针，拖到 iframe/编辑器上也不丢事件
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
      root.style.setProperty(CODE_SPLIT_VAR, `${splitWRef.current}px`);
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

  const label = code.label || code.fileName || 'CODE';

  return (
    <>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="demo-toggle">
        <span className="demo-live-dot" aria-hidden="true" />
        {open ? '关闭代码' : '查看代码'}
      </button>

      {open &&
        body &&
        createPortal(
          <div id={CODE_SIDEBAR_ID} className={`demo-frame-wrap${dragging ? ' demo-dragging' : ''}`}>
            <div
              className={`demo-colsplit-resizer${dragging ? ' is-dragging' : ''}`}
              role="separator"
              aria-orientation="vertical"
              aria-label="拖动调节文章与代码区左右比例"
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
                <a href={code.src} download={code.fileName || true} className="demo-frame-bar-btn">
                  下载代码 ⭳
                </a>
                <button type="button" onClick={copy} className="demo-frame-bar-btn">
                  {copied ? '已复制' : '复制'}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="demo-frame-bar-btn">
                  ✕ 关闭
                </button>
              </div>
            </div>

            <div className="demo-code-cm">
              {status === 'error' && <div className="demo-code-error">未能读取代码文件（外链 / 跨域）</div>}
              {status === 'ok' && (
                <CodeMirror
                  value={text}
                  extensions={extensions}
                  theme={demoTheme}
                  height="100%"
                  basicSetup={{ lineNumbers: true, foldGutter: true }}
                  readOnly
                />
              )}
              {status !== 'ok' && (
                <div className="demo-code-loading">{status === 'loading' ? '读取代码中…' : '加载编辑器…'}</div>
              )}
            </div>
          </div>,
          body
        )}
    </>
  );
}
