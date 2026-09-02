'use client';

import { useEffect, useRef, useState } from 'react';
import { api, getToken, API_BASE, type PostType } from './api';
import { getAiContext, onAiContext, notifyAiDataChanged, notifyAiInsertContent } from '@/lib/ai-context';

interface ChatMsg {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thinking?: string[];
  pending?: PendingAction[];
  toolLog?: { name: string; friendly: string }[];
  error?: boolean;
  welcome?: boolean;
}

interface PendingAction {
  name: 'update_post' | 'batch_update';
  args: Record<string, unknown>;
}

const friendly = (name: string, args: Record<string, unknown>): string => {
  if (name === 'update_post') return `修改文章《${args.slug}》`;
  if (name === 'batch_update') return `批量修改 ${((args.slugs as unknown[]) || []).length} 篇文章`;
  return name;
};

export function AiAssistant({ onClose }: { onClose: () => void }) {
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        '你好，我是后台 AI 助手。我可以帮你润色 / 重写 / 扩写文章（会感知你当前正在编辑或查看的页面），也能查询文章、分类标签，或替你批量调整分类、标签、可见状态——写操作会先给你确认。直接说你的要求即可。',
      welcome: true,
    },
  ]);
  const [context, setContext] = useState('');
  const bodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setContext(getAiContext());
    return onAiContext(setContext);
  }, []);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, busy]);

  const stop = () => abortRef.current?.abort();

  const send = async (raw?: string) => {
    const text = (raw ?? input).trim();
    if (!text || busy) return;
    setInput('');
    const history: ChatMsg[] = [...msgs, { role: 'user', content: text }];
    // 占位气泡：先显示「思考中」，工具日志与文字会实时填充进来
    setMsgs([...history, { role: 'assistant', content: '', thinking: [] }]);
    setBusy(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let tmp = '';
    let thinking: string[] = [];
    let pendingActions: PendingAction[] = [];
    const update = () => {
      const next: ChatMsg = {
        role: 'assistant',
        content: tmp,
        thinking: thinking.length ? [...thinking] : undefined,
        pending: pendingActions.length ? [...pendingActions] : undefined,
      };
      setMsgs((prev) => [...prev.slice(0, -1), next]);
    };
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-token': token || '' },
        body: JSON.stringify({
          messages: history.filter((m) => m.role !== 'system').map((m) => ({ role: m.role, content: m.content })),
          context,
          stream: true,
        }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        let msg = `请求失败 (${res.status})`;
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf('\n')) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          let ev: { type?: string; text?: string; log?: string; action?: PendingAction; pending?: PendingAction[]; message?: string };
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.type === 'chunk') tmp += ev.text ?? '';
          else if (ev.type === 'tool' && ev.log) thinking.push(ev.log);
          else if (ev.type === 'pending' && ev.action) pendingActions.push(ev.action);
          else if (ev.type === 'done' && Array.isArray(ev.pending)) pendingActions = ev.pending as PendingAction[];
          else if (ev.type === 'error') throw new Error(ev.message || 'AI 请求失败');
          update();
        }
      }
      update();
      if (!tmp && !pendingActions.length) {
        setMsgs((prev) => [...prev.slice(0, -1), { role: 'assistant', content: '（AI 没有返回内容）' }]);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 手动停止：保留已生成的内容；完全没内容时给个提示
        if (tmp || pendingActions.length) update();
        else setMsgs((prev) => [...prev.slice(0, -1), { role: 'assistant', content: '已停止' }]);
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

  const executePending = async (p: PendingAction) => {
    if (busy) return;
    setBusy(true);
    try {
      if (p.name === 'update_post') {
        const type = String(p.args.type) as PostType;
        const slug = String(p.args.slug);
        // PUT 会整体重写 frontmatter，先读原文再合并补丁，避免正文/元信息被清空
        const cur = await api<{ meta: Record<string, unknown>; content: string }>(
          `/api/post?type=${type}&slug=${encodeURIComponent(slug)}`
        );
        const patch = p.args;
        const meta: Record<string, unknown> = {
          ...cur.meta,
          ...(patch.title !== undefined ? { title: patch.title } : {}),
          ...(patch.date !== undefined ? { date: patch.date } : {}),
          ...(patch.summary !== undefined ? { summary: patch.summary } : {}),
          ...(patch.category !== undefined ? { category: patch.category } : {}),
          ...(patch.chapter !== undefined && patch.chapter !== ''
            ? { chapter: patch.chapter }
            : { chapter: undefined }),
          ...(Array.isArray(patch.tags) ? { tags: patch.tags } : {}),
          ...(patch.status !== undefined ? { status: patch.status } : {}),
          ...(patch.hidden !== undefined ? { hidden: patch.hidden } : {}),
        };
        const content = typeof patch.content === 'string' ? patch.content : cur.content;
        await api<{ slug: string }>(`/api/posts?type=${type}`, {
          method: 'PUT',
          body: JSON.stringify({ ...meta, slug, content }),
        });
      } else if (p.name === 'batch_update') {
        const type = String(p.args.type) as PostType;
        const slugs = (p.args.slugs as unknown[])?.map(String) || [];
        const hiddenAction = p.args.hide === true ? 'hide' : p.args.hide === false ? 'show' : '';
        await api<{ ok: boolean }>(`/api/posts/batch?type=${type}`, {
          method: 'POST',
          body: JSON.stringify({
            slugs,
            action: 'update',
            setCategory: !!p.args.setCategory,
            category: String(p.args.category || ''),
            setChapter: !!p.args.setChapter,
            chapter: String(p.args.chapter || ''),
            addTags: (p.args.addTags as unknown[]) || [],
            removeTags: (p.args.removeTags as unknown[]) || [],
            hiddenAction,
          }),
        });
      }
      notifyAiDataChanged();
      setMsgs((prev) => [...prev, { role: 'system', content: `已执行：${friendly(p.name, p.args)}` }]);
    } catch (err) {
      setMsgs((prev) => [
        ...prev,
        { role: 'assistant', content: `执行失败：${err instanceof Error ? err.message : '未知错误'}`, error: true },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const applyToEditor = (text: string) => notifyAiInsertContent(text);

  return (
    <>
      <style>{`@keyframes aiBlink{0%,49%{opacity:1}50%,100%{opacity:0}}.ai-cursor{display:inline-block;width:2px;height:1em;margin-left:3px;vertical-align:-2px;background:var(--accent);animation:aiBlink 0.9s steps(2,start) infinite}`}</style>
      <aside
        className="sticky top-24 flex h-[calc(100svh-7rem)] w-[min(360px,88vw)] shrink-0 flex-col overflow-hidden rounded-2xl border border-line bg-panel/95 backdrop-blur"
        style={{ boxShadow: 'var(--shadow)' }}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="marker-dot is-live !h-[5px] !w-[5px]" />
            <span className="mono-label !text-accent">AI 助手</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-[10.5px] tracking-[0.1em] text-ink-faint uppercase">
              {context.includes('正在编辑') ? '编辑器感知' : context ? '页面感知' : '通用'}
            </span>
            <button
              onClick={onClose}
              title="关闭助手"
              className="text-[18px] leading-none text-ink-faint transition-colors hover:text-accent"
            >
              ×
            </button>
          </div>
        </div>

        <div ref={bodyRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4 scroll-thin">
          {msgs.map((m, i) => {
            if (m.role === 'system') {
              return (
                <div key={i} className="flex justify-center">
                  <span className="rounded-full border border-line bg-panel px-3 py-1 font-mono text-[11px] text-ink-faint">
                    {m.content}
                  </span>
                </div>
              );
            }
            const isUser = m.role === 'user';
            return (
              <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                    isUser
                      ? 'text-white'
                      : m.error
                        ? 'border border-accent/40 bg-accent/5 text-accent'
                        : 'border border-line bg-panel'
                  }`}
                  style={isUser ? { background: 'var(--accent)' } : undefined}
                >
                  {isUser ? (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  ) : (
                    <>
                      {m.thinking && m.thinking.length > 0 && (
                        <div className="mb-2 space-y-1 border-l-2 border-accent/30 pl-2.5">
                          {m.thinking.map((t, k) => (
                            <div key={k} className="font-mono text-[11px] text-ink-faint">
                              ✓ {t}
                            </div>
                          ))}
                        </div>
                      )}
                      {!m.content && m.thinking !== undefined && busy && i === msgs.length - 1 && (
                        <div className="font-mono text-[12px] text-ink-faint">正在思考…</div>
                      )}
                      <div className="md-body !text-[13.5px] prose-tight" dangerouslySetInnerHTML={{ __html: m.content }} />
                      {busy && i === msgs.length - 1 && <span className="ai-cursor" />}
                      {(m.content.length > 80 || m.content.includes('```')) && !m.welcome && (
                        <button
                          onClick={() => applyToEditor(m.content)}
                          className="mt-2 rounded-md border border-accent/40 px-2.5 py-1 font-mono text-[11.5px] text-accent transition-colors hover:bg-accent/10"
                        >
                          应用到正文
                        </button>
                      )}
                    </>
                  )}
                  {m.pending?.map((p, j) => (
                    <div key={j} className="mt-2.5 rounded-lg border border-accent/40 bg-accent/5 p-3">
                      <div className="font-mono text-[11.5px] text-accent">{friendly(p.name, p.args)}</div>
                      <div className="mt-1 text-[12px] whitespace-pre-wrap text-ink-soft">
                        {JSON.stringify(
                          Object.fromEntries(
                            Object.entries(p.args).filter(([k]) =>
                              [
                                'title',
                                'summary',
                                'category',
                                'chapter',
                                'tags',
                                'status',
                                'hide',
                                'setCategory',
                                'setChapter',
                                'addTags',
                                'removeTags',
                                'slugs',
                                'content',
                              ].includes(k)
                            )
                          ),
                          null,
                          1
                        ).slice(0, 420)}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <button
                          onClick={() => executePending(p)}
                          className="rounded-md px-3 py-1 text-[12px] font-semibold text-white transition-colors hover:opacity-90"
                          style={{ background: 'var(--accent)' }}
                        >
                          确认执行
                        </button>
                        <span className="font-mono text-[10.5px] text-ink-faint">执行后不可撤销，建议先核对</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 border-t border-line px-3 py-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3.5 py-2.5 text-[13.5px] text-ink transition-colors focus:border-accent/60 focus:outline-none"
          />
          <button
            onClick={() => (busy ? stop() : void send())}
            disabled={!busy && !input.trim()}
            className="rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white transition-all hover:scale-[1.03] active:scale-95 disabled:opacity-40"
            style={{ background: 'var(--accent)' }}
          >
            {busy ? '停止' : '发送'}
          </button>
        </div>
      </aside>
    </>
  );
}