import Link from 'next/link';

export function TagChip({
  tag,
  href,
  clickable = false,
}: {
  tag: string;
  href?: string;
  clickable?: boolean;
}) {
  const cls =
    'inline-flex items-center rounded-md border border-line px-2.5 py-[4px] font-mono text-[12.5px] tracking-wide text-ink-soft transition-colors hover:border-accent/60 hover:text-accent';
  if (href || clickable) {
    return (
      <Link href={href ?? `/notes?tag=${encodeURIComponent(tag)}`} className={cls}>
        {tag}
      </Link>
    );
  }
  return <span className={cls}>{tag}</span>;
}
