'use client';

import { useAtom } from 'jotai';

import { leftPaneViewAtom } from '@/ui/segments/project/get-started/elements/left-pane-view-atom';

import type { MouseEvent, ReactNode } from 'react';

const CLICKABLE_SELECTOR = 'button, a, [role="button"], [data-slot="card"]';

export function DimWhenHelpOpen({ children }: { children: ReactNode }) {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const isDimmed = view !== null;

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    const { clientX, clientY } = event;
    setView(null);

    requestAnimationFrame(() => {
      const stack = document.elementsFromPoint(clientX, clientY);
      for (const el of stack) {
        const target = (
          el.matches(CLICKABLE_SELECTOR) ? el : el.closest<HTMLElement>(CLICKABLE_SELECTOR)
        ) as HTMLElement | null;
        if (target && target.getAttribute('aria-label') !== 'Close help') {
          target.click();
          return;
        }
      }
    });
  };

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        aria-label="Close help"
        onClick={handleClick}
        tabIndex={isDimmed ? 0 : -1}
        className={`absolute inset-0 cursor-pointer rounded-lg bg-white/45 transition-opacity duration-200 ${
          isDimmed ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />
    </div>
  );
}

export default DimWhenHelpOpen;
