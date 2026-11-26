'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/utils/css-class';

/** More dots than this, as on Our story, are drawn smaller to stay on the screen. */
const DENSE_FROM = 14;

/**
 * Dots down the right of a page, one to each of its `[data-page-section]`: the one crossing the middle of the screen
 * dark, and a click going to it. Not on a phone, where a finger scrolls the page and they would sit over it.
 */
export default function SectionRail() {
  const sections = useRef<HTMLElement[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let crossing: IntersectionObserver | undefined;
    const watch = () => {
      crossing?.disconnect();
      const found = Array.from(document.querySelectorAll<HTMLElement>('[data-page-section]'));
      sections.current = found;
      setLabels(
        found.map(
          (section, i) => section.querySelector('h1, h2')?.textContent?.trim() || `Section ${i + 1}`
        )
      );
      crossing = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) setActive(found.indexOf(entry.target as HTMLElement));
          }
        },
        { rootMargin: '-50% 0px -50% 0px' }
      );
      for (const section of found) crossing.observe(section);
    };
    watch();
    // More sections come in, as more news is loaded.
    const added = new MutationObserver(() => {
      const now = document.querySelectorAll('[data-page-section]').length;
      if (now !== sections.current.length) watch();
    });
    added.observe(document.body, { childList: true, subtree: true });
    return () => {
      crossing?.disconnect();
      added.disconnect();
    };
  }, []);

  const dense = labels.length > DENSE_FROM;
  return (
    <nav
      aria-label="Sections of this page"
      className={cn(
        'fixed top-1/2 right-5 z-40 flex -translate-y-1/2 flex-col max-md:hidden',
        dense ? 'gap-[6px]' : 'gap-4'
      )}
    >
      {labels.map((label, i) => (
        <button
          key={`${label}/${i}`}
          type="button"
          aria-label={`Go to ${label}`}
          aria-current={i === active ? 'true' : undefined}
          onClick={() => {
            setActive(i);
            sections.current[i]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }}
          className="flex w-4 cursor-pointer items-center justify-center transition-opacity hover:opacity-70"
        >
          <span
            className={cn(
              'w-2 rounded-lg transition-colors duration-300',
              dense ? 'h-[10px]' : 'h-4',
              i === active ? 'bg-primary-9' : 'bg-neutral-3'
            )}
          />
        </button>
      ))}
    </nav>
  );
}
