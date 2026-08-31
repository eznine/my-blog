import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="map-grid relative flex min-h-[76vh] flex-col items-center justify-center px-6 text-center">
      <span className="marker-dot is-live !h-3.5 !w-3.5" />
      <h1 className="mt-8 font-mono text-7xl font-black tracking-tight text-ink glow-text md:text-8xl">404</h1>
      <p className="mt-5 text-lg text-ink-soft">该坐标不在本图幅范围内。</p>
      <p className="mono-label mt-3">TERRA INCOGNITA · UNKNOWN REGION</p>
      <Link
        href="/"
        className="mt-10 rounded-xl px-8 py-3.5 text-base font-semibold text-white transition-transform duration-300 hover:scale-105 active:scale-95"
        style={{ background: 'var(--accent)', boxShadow: '0 0 34px var(--accent-glow)' }}
      >
        返回首页
      </Link>
    </div>
  );
}
