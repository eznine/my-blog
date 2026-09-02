import Link from 'next/link';
import { site } from '@/lib/site-server';

export default function NotFound() {
  return (
    <div className="map-grid relative flex min-h-[76svh] flex-col items-center justify-center px-6 text-center">
      <span className="marker-dot is-live !h-3.5 !w-3.5" />
      <h1 className="mt-8 font-mono text-7xl font-black tracking-tight text-ink glow-text md:text-8xl">{site.notFound.code}</h1>
      <p className="mt-5 text-lg text-ink-soft">{site.notFound.message}</p>
      <p className="mono-label mt-3">{site.notFound.label}</p>
      <Link
        href="/"
        className="mt-10 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-transform duration-300 hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)' }}
      >
        <span style={{ textShadow: 'none' }}>{site.notFound.back}</span>
      </Link>
    </div>
  );
}
