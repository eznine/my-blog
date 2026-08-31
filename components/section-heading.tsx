import Link from 'next/link';

export function SectionHeading({
  code,
  en,
  title,
  href,
  linkLabel = '查看全部',
}: {
  code: string;
  en: string;
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-7 flex items-end justify-between gap-4 border-b border-line pb-3">
      <div>
        <div className="mono-label">
          {code} · {en}
        </div>
        <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-ink">{title}</h2>
      </div>
      {href && (
        <Link
          href={href}
          className="group shrink-0 pb-0.5 text-sm text-ink-soft transition-colors hover:text-accent"
        >
          {linkLabel}
          <span className="ml-1 inline-block transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      )}
    </div>
  );
}
