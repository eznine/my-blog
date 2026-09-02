import Link from 'next/link';
import { site } from '@/lib/site-server';
import { BrandLogo } from './brand-logo';
import { SiteUtilities } from './site-utilities';

export function SiteFooter() {
  return (
    <footer className="relative mt-28 border-t border-line">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-px h-px"
        style={{ background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.7 }}
      />
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-14 md:pb-14">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div>
            <BrandLogo className="h-9" />
            <p className="mt-4 flex items-center gap-2.5 text-[15px] text-ink-soft">
              <span className="marker-dot is-live" />
              {site.name} · {site.role}
            </p>
            <p className="mono-label mt-6">{site.coords} · WGS 84</p>
          </div>

          <nav className="grid grid-cols-2 gap-x-14 gap-y-3 text-[15px]">
            {site.nav
              .filter((l) => l.href !== '/')
              .map((l) => (
                <Link key={l.href} href={l.href} className="text-ink-soft transition-colors hover:text-accent">
                  {l.label}
                </Link>
              ))}
          </nav>

          <div className="flex flex-col gap-3 text-[15px]">
            <a href={site.github} target="_blank" rel="noreferrer" className="text-ink-soft transition-colors hover:text-accent">
              {site.footer.github}
            </a>
            <a href={`mailto:${site.email}`} className="text-ink-soft transition-colors hover:text-accent">
              {site.email}
            </a>
          </div>
        </div>

        <SiteUtilities />

        <div className="mt-12 flex flex-col gap-2 border-t border-line pt-6 text-[13px] text-ink-faint md:flex-row md:items-center md:justify-between">
          <span>
            {site.footer.copyright.replace('{year}', String(new Date().getFullYear())).replace('{name}', site.name)}
          </span>
          <span className="font-mono tracking-[0.14em]">{site.footer.sheet}</span>
        </div>
      </div>
    </footer>
  );
}
