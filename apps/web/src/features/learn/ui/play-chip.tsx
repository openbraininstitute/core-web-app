'use client';

import { useRouter } from 'next/navigation';

import { cn } from '@/utils/css-class';

/**
 * A green round button into something, inside a card's own button: so a span, not a link or a
 * button. A play triangle into a course; an arrow out to another site, opened in a new tab.
 */
export function PlayChip({
  title,
  href,
  external = false,
  className,
}: {
  title: string;
  href: string;
  external?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const go = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (external) window.open(href, '_blank', 'noopener,noreferrer');
    else router.push(href);
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: a link cannot sit inside the card's own button
    <span
      role="link"
      tabIndex={0}
      aria-label={`Open ${title}`}
      title={external ? 'Open it at its source, in a new tab' : 'Open the course'}
      onClick={go}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') go(e);
        else e.stopPropagation();
      }}
      className={cn(
        'flex size-[28px] items-center justify-center rounded-full bg-[#389e0d] text-white shadow-[0_2px_6px_rgba(56,158,13,0.35)] transition-colors hover:bg-[#237804]',
        className
      )}
    >
      {external ? (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="size-[12px]">
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 11 11 5M6 5h5v5"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 16 16" aria-hidden="true" className="ml-[2px] size-[12px]">
          <path
            fill="currentColor"
            d="M4 2.5v11a.6.6 0 0 0 .9.5l9-5.5a.6.6 0 0 0 0-1l-9-5.5a.6.6 0 0 0-.9.5Z"
          />
        </svg>
      )}
    </span>
  );
}
