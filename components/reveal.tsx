'use client';

import { useEffect, useRef } from 'react';

type Variant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur';

const cls: Record<Variant, string> = {
  up: 'rv-up',
  down: 'rv-down',
  left: 'rv-left',
  right: 'rv-right',
  scale: 'rv-scale',
  blur: 'rv-blur',
};

export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  variant?: Variant;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'span';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`rv ${cls[variant]} ${className ?? ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}
