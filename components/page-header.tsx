export function PageHeader({
  code,
  en,
  title,
  desc,
  children,
}: {
  code: string;
  en: string;
  title: string;
  desc?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="page-enter relative border-b border-line pb-10">
      <div className="map-grid map-grid-fade pointer-events-none absolute -inset-x-6 -top-10 bottom-0" aria-hidden="true" />
      <div className="relative">
        <div className="mono-label flex items-center gap-2.5 !text-accent">
          <span className="marker-dot is-live" />
          {code} · {en}
        </div>
        <h1 className="mt-4 text-4xl font-black tracking-tight text-ink md:text-5xl">{title}</h1>
        {desc && <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-ink-soft">{desc}</p>}
        {children}
      </div>
    </header>
  );
}
