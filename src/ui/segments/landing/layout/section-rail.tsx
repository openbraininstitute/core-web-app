'use client';

import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

/** More dots than this, as on Our story, are drawn smaller to stay on the screen. */
const DENSE_FROM = 14;

/**
 * Dots down the right of a page, one to each of its `[data-page-section]`: the one crossing the middle of the screen
 * dark, and a click going to it. Not on a phone, where a finger scrolls the page and they would sit over it.
 */
export default function SectionRail() {
  const [sections, setSections] = useState<Array<{ element: HTMLElement; key: string }>>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const keys = new Map<HTMLElement, string>();
    const collect = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>('[data-page-section]')).map(
        (element) => {
          let key = keys.get(element);
          if (!key) {
            key = `section-${keys.size}`;
            keys.set(element, key);
          }
          return { element, key };
        }
      );
      setSections((previous) =>
        previous.length === found.length &&
        previous.every((section, i) => section.element === found[i]?.element)
          ? previous
          : found
      );
    };
    collect();
    const added = new MutationObserver(collect);
    added.observe(document.body, { childList: true, subtree: true });
    return () => added.disconnect();
  }, []);

  useEffect(() => {
    const crossing = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting)
            setActive(sections.findIndex((section) => section.element === entry.target));
        }
      },
      { rootMargin: '-50% 0px -50% 0px' }
    );
    for (const section of sections) crossing.observe(section.element);
    return () => crossing.disconnect();
  }, [sections]);

  const dense = sections.length > DENSE_FROM;
  return (
    <nav
      aria-label="Sections of this page"
      className={cn(
        'fixed top-1/2 right-5 z-40 flex -translate-y-1/2 flex-col max-md:hidden',
        dense ? 'gap-[6px]' : 'gap-4'
      )}
    >
      {sections.map(({ element, key }, i) => {
        const label = element.querySelector('h1, h2')?.textContent?.trim() || `Section ${i + 1}`;
        return (
          <button
            key={key}
            type="button"
            aria-label={`Go to ${label}`}
            aria-current={i === active ? 'true' : undefined}
            onClick={() => {
              setActive(i);
              element.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        );
      })}
    </nav>
  );
}
