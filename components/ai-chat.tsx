'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { AI_API_KEY, AI_BASE_URL, AI_MODEL } from '@/lib/ai-config';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
  thinking?: boolean;
  error?: boolean;
}

const BALL_SIZE = 56;
const EDGE = 6;
const PANEL_GAP = 10;
const PANEL_MAX_W = 384;
const PANEL_MAX_H = 600;
const POS_KEY = 'ez-ai-pos';
const CHAT_KEY = 'ez-ai-chat';

const WELCOME: ChatMsg = {
  role: 'assistant',
  content: '你好，我是这个站点的 AI 助手。想问什么都可以，直接说就好。',
};

const SYSTEM_PROMPT =
  '你是一个简洁友好的中文 AI 助手。回答时直接给出结果，不要重复用户的提问。';

const clampPos = (p: { x: number; y: number }, vw: number, vh: number) => ({
  x: Math.max(EDGE, Math.min(vw - BALL_SIZE - EDGE, p.x)),
  y: Math.max(EDGE, Math.min(vh - BALL_SIZE - EDGE, p.y)),
});

const savePos = (p: { x: number; y: number }) => {
  try {
    localStorage.setItem(POS_KEY, JSON.stringify(p));
  } catch {}
};

const buildPanelStyle = (
  pos: { x: number; y: number } | null,
  vp: { w: number; h: number }
) => {
  const w = Math.min(PANEL_MAX_W, vp.w - 10);
  const h = Math.min(PANEL_MAX_H, vp.h - 10);
  const bx = pos ? pos.x : vp.w - BALL_SIZE - 16;
  const by = pos ? pos.y : vp.h - BALL_SIZE - 16;
  const leftBase = bx + BALL_SIZE / 2 > vp.w / 2 ? bx - PANEL_GAP - w : bx + BALL_SIZE + PANEL_GAP;
  const topBase = by + BALL_SIZE / 2 > vp.h / 2 ? by - PANEL_GAP - h : by + BALL_SIZE + PANEL_GAP;
  return {
    left: Math.max(EDGE, Math.min(vp.w - w - EDGE, leftBase)),
    top: Math.max(EDGE, Math.min(vp.h - h - EDGE, topBase)),
    width: w,
    height: h,
  };
};

const IconSend = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M22 2 11 13" />
    <path d="M22 2 15 22l-4-9-9-4 20-7z" />
  </svg>
);

const IconStop = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="1" />
  </svg>
);

const IconClose = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </svg>
);

const IconTrash = ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
    <path d="M10 11v6" />
    <path d="M14 11v6" />
  </svg>
);

const IconChat = ({ className = 'h-5 w-5' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

export function AiChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const [msgs, setMsgs] = useState<ChatMsg[]>([WELCOME]);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const suppressClickRef = useRef(false);

  useEffect(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    setVp({ w: vw, h: vh });
    try {
      const raw = localStorage.getItem(POS_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { x: number; y: number };
        if (Number.isFinite(p.x) && Number.isFinite(p.y)) {
          setPos(clampPos(p, vw, vh));
        }
      }
    } catch {}
    try {
      const raw = localStorage.getItem(CHAT_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as ChatMsg[];
        if (Array.isArray(arr) && arr.length) setMsgs(arr);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onResize = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      setVp({ w: vw, h: vh });
      setPos((prev) => (prev ? clampPos(prev, vw, vh) : prev));
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (busy) return;
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(msgs.filter((m) => !m.error)));
    } catch {}
  }, [msgs, busy]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy, open]);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 112)}px`;
  }, [input, open]);

  const panelStyle = useMemo(() => (vp.w ? buildPanelStyle(pos, vp) : null), [pos, vp]);

  if (pathname && pathname.startsWith('/admin')) return null;

  const handleBallClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    setOpen((v) => !v);
  };

  const handleBallPointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos ? pos.x : vw - BALL_SIZE - 16,
      originY: pos ? pos.y : vh - BALL_SIZE - 16,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleBallPointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.moved && Math.hypot(dx, dy) < 6) return;
    d.moved = true;
    setPos(clampPos({ x: d.originX + dx, y: d.originY + dy }, window.innerWidth, window.innerHeight));
  };

  const handleBallPointerUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (d.moved) {
      suppressClickRef.current = true;
      const final = clampPos(
        { x: d.originX + (e.clientX - d.startX), y: d.originY + (e.clientY - d.startY) },
        window.innerWidth,
        window.innerHeight
      );
      setPos(final);
      savePos(final);
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleBallPointerCancel = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
  };

  const stop = () => abortRef.current?.abort();

  const clear = () => {
    const ctrl = abortRef.current;
    abortRef.current = null;
    ctrl?.abort();
    setMsgs([WELCOME]);
    setInput('');
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy || !AI_API_KEY) return;
    const history = msgs
      .filter((m) => !m.error && !m.thinking && m.content)
      .map((m) => ({ role: m.role, content: m.content }));
    setMsgs([
      ...msgs,
      { role: 'user', content: text },
      { role: 'assistant', content: '', thinking: true },
    ]);
    setInput('');
    setBusy(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let content = '';
    let reasoning = '';
    const update = () => {
      if (abortRef.current !== ctrl) return;
      setMsgs((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content, thinking: !content };
        return next;
      });
    };

    try {
      const res = await fetch(`${AI_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_API_KEY}`,
        },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history,
            { role: 'user', content: text },
          ],
          stream: true,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        let msg = `请求失败 (${res.status})`;
        try {
          const j = await res.json();
          msg = j?.error?.message || j?.message || msg;
        } catch {}
        throw new Error(msg);
      }
      if (!res.body) throw new Error('当前浏览器不支持流式响应');

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const raw = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!raw.startsWith('data:')) continue;
          const data = raw.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const j = JSON.parse(data);
            const delta = j?.choices?.[0]?.delta;
            if (delta?.reasoning_content) reasoning += delta.reasoning_content;
            if (delta?.content) content += delta.content;
            update();
          } catch {}
        }
      }
      setMsgs((prev) => [
        ...prev.slice(0, -1),
        { role: 'assistant', content: content || reasoning || '（模型未返回回答内容）' },
      ]);
    } catch (err) {
      if (abortRef.current !== ctrl) return;
      const isAbort = err instanceof DOMException && err.name === 'AbortError';
      if (isAbort) {
        setMsgs((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: content || '已停止' },
        ]);
      } else {
        setMsgs((prev) => [
          ...prev.slice(0, -1),
          { role: 'assistant', content: err instanceof Error ? err.message : '请求失败', error: true },
        ]);
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label={open ? '收起 AI 助手' : '打开 AI 助手'}
        title={open ? '收起 AI 助手' : '打开 AI 助手'}
        onClick={handleBallClick}
        onPointerDown={handleBallPointerDown}
        onPointerMove={handleBallPointerMove}
        onPointerUp={handleBallPointerUp}
        onPointerCancel={handleBallPointerCancel}
        className={`fixed z-50 flex h-14 w-14 cursor-grab touch-none items-center justify-center rounded-full border bg-panel/90 text-accent shadow-[0_10px_32px_rgba(28,23,16,0.2)] backdrop-blur transition-colors duration-200 select-none active:cursor-grabbing ${
          pos ? '' : 'right-4 bottom-4'
        } ${open ? 'border-accent/70' : 'border-line hover:border-accent/60'}`}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
      >
        <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent shadow-[0_0_10px_rgba(255,75,51,0.7)]" />
        <span className="pointer-events-none absolute inset-0 rounded-full border border-accent/15" />
        <IconChat />
      </button>

      {open && panelStyle && (
        <div
          role="dialog"
          aria-label="AI 助手"
          className="ez-ai-panel fixed z-40 flex flex-col overflow-hidden rounded-2xl border border-line bg-panel/95 backdrop-blur-xl"
          style={{ ...panelStyle, boxShadow: 'var(--shadow)' }}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
              </span>
              <span className="mono-label !text-accent">AI 助手</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clear}
                title="清空对话"
                aria-label="清空对话"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <IconTrash />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                title="收起"
                aria-label="收起"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <IconClose />
              </button>
            </div>
          </div>

          <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {msgs.map((m, i) => {
              const isUser = m.role === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                      isUser
                        ? 'text-white'
                        : m.error
                          ? 'border border-accent/40 bg-accent/5 text-accent'
                          : 'border border-line bg-panel'
                    }`}
                    style={isUser ? { background: 'var(--accent)' } : undefined}
                  >
                    {m.content ? (
                      <div className="break-words whitespace-pre-wrap">
                        {m.content}
                        {busy && i === msgs.length - 1 && !isUser && <span className="ai-cursor" />}
                      </div>
                    ) : (
                      <span className="flex flex-col gap-1 font-mono text-[12px] text-ink-faint">
                        <span>正在思考</span>
                        <span className="ai-cursor" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {!AI_API_KEY && (
              <div className="rounded-lg border border-accent/40 bg-accent/5 px-3 py-2 font-mono text-[11.5px] text-accent">
                AI 未配置：缺少 NEXT_PUBLIC_AI_API_KEY
              </div>
            )}
          </div>

          <div className="border-t border-line px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                placeholder="输入消息…"
                className="max-h-[112px] min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-[13.5px] leading-relaxed text-ink transition-colors placeholder:text-ink-faint focus:border-accent/60 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => (busy ? stop() : void send())}
                disabled={busy ? false : !input.trim() || !AI_API_KEY}
                title={busy ? '停止' : '发送'}
                aria-label={busy ? '停止' : '发送'}
                className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl text-white transition-all hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
                style={{ background: 'var(--accent)' }}
              >
                {busy ? <IconStop /> : <IconSend />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
