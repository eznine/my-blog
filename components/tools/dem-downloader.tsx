'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * DEM 下载器嵌入组件（本地工具）。
 * 检测 127.0.0.1:8080 的服务是否在线：在线则嵌入 iframe（新窗口可开），
 * 离线则提示先启动本地服务。no-cors 探测只区分「网络可达/不可达」，
 * 不受后端 CORS 头影响（仅关心服务在不在跑）。
 */

export interface DemCopy {
  title: string;
  en: string;
  status: string;
  desc: string;
  open: string;
  hint: string;
  offline: string;
  checking: string;
  retry: string;
}

const DEM_URL = 'http://127.0.0.1:8080';

export function DemDownloader({ copy }: { copy: DemCopy }) {
  const [state, setState] = useState<'checking' | 'online' | 'offline'>('checking');
  const [opened, setOpened] = useState(false);

  const probe = useCallback(() => {
    setState('checking');
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 2500);
    fetch(`${DEM_URL}/api/health`, { mode: 'no-cors', cache: 'no-store', signal: ctrl.signal })
      .then(() => {
        clearTimeout(timer);
        setState('online');
      })
      .catch(() => {
        clearTimeout(timer);
        setState('offline');
      });
  }, []);

  useEffect(probe, [probe]);

  return (
    <article className="explore-card relative flex h-full flex-col rounded-2xl p-6 md:p-7">
      <span className="corner" aria-hidden="true" />
      <div className="relative flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 font-mono text-[12px] tracking-[0.14em]">
          <span className="marker-dot" />
          <span className="text-accent">{copy.en}</span>
        </div>
        <span
          className={`rounded-full border px-3 py-1 font-mono text-[11px] tracking-[0.12em] ${
            state === 'online'
              ? 'border-accent/40 bg-accent/10 text-accent'
              : state === 'checking'
                ? 'border-line-strong text-ink-faint'
                : 'border-line-strong text-ink-faint'
          }`}
        >
          {state === 'online' ? copy.status : state === 'checking' ? copy.checking : 'OFFLINE · 未检测到'}
        </span>
      </div>

      <h2 className="relative mt-4 text-[1.5rem] font-bold leading-tight text-ink">{copy.title}</h2>
      <p className="relative mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-soft">{copy.desc}</p>

      <div className="relative mt-5 flex flex-wrap items-center gap-3">
        {state === 'online' && !opened && (
          <button
            type="button"
            onClick={() => setOpened(true)}
            className="cursor-pointer rounded-lg bg-accent px-5 py-2.5 text-[14px] font-semibold text-white shadow-[0_0_24px_var(--accent-glow)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-strong"
          >
            运行 {copy.en}
          </button>
        )}
        <a
          href={DEM_URL}
          target="_blank"
          rel="noreferrer"
          className="cursor-pointer rounded-lg border border-line px-5 py-2.5 text-[14px] font-medium text-ink-soft transition-colors hover:border-accent/60 hover:text-accent"
        >
          {copy.open}
        </a>
        {state === 'offline' && (
          <button
            type="button"
            onClick={probe}
            className="cursor-pointer rounded-lg border border-accent/50 px-5 py-2.5 text-[14px] font-medium text-accent transition-colors hover:bg-accent/10"
          >
            ↻ {copy.retry}
          </button>
        )}
      </div>

      <div className="relative mt-4 min-h-[46px]">
        {state === 'checking' && <p className="text-[13px] text-ink-faint">{copy.checking}</p>}
        {state === 'offline' && <p className="text-[13px] leading-relaxed text-ink-faint">{copy.offline}</p>}
      </div>

      <p className="relative mt-2 text-[12.5px] leading-relaxed text-ink-faint">{copy.hint}</p>

      {state === 'online' && opened && (
        <div className="relative mt-5">
          <div className="flex items-center justify-between border border-line bg-panel-solid px-4 py-2.5">
            <span className="font-mono text-[11px] tracking-[0.14em] text-ink-faint">
              {copy.en} · {DEM_URL}
            </span>
            <button
              type="button"
              onClick={() => setOpened(false)}
              className="cursor-pointer text-[13px] text-ink-soft transition-colors hover:text-accent"
            >
              收起 ▲
            </button>
          </div>
          <iframe
            src={DEM_URL}
            title={copy.title}
            loading="lazy"
            className="block h-[72vh] min-h-[520px] w-full border border-t-0 border-line bg-panel-solid"
          />
        </div>
      )}
    </article>
  );
}