'use client';

import { type ReactNode, useEffect, useRef } from 'react';

/** Keep the complete signup form in view after its disclosure opens. */
export default function NewsletterDisclosure({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const details = disclosure.current;
    const row = details?.closest('footer');
    if (!details || !row) return;
    const measure = () => {
      const panel = details.lastElementChild;
      row.style.setProperty(
        '--newsletter-form-height',
        `${panel?.getBoundingClientRect().height ?? 0}px`
      );
    };
    const resize = new ResizeObserver(measure);
    let panel = details.lastElementChild;
    if (panel) resize.observe(panel);
    const mutation = new MutationObserver(() => {
      if (panel !== details.lastElementChild) {
        if (panel) resize.unobserve(panel);
        panel = details.lastElementChild;
        if (panel) resize.observe(panel);
      }
      measure();
    });
    mutation.observe(details, { childList: true, subtree: true });
    measure();
    return () => {
      resize.disconnect();
      mutation.disconnect();
      row.style.removeProperty('--newsletter-form-height');
    };
  }, []);
  return (
    <details
      ref={disclosure}
      className={className}
      onToggle={(event) => {
        const details = event.currentTarget;
        if (!details.open) return;
        requestAnimationFrame(() => {
          if (!details.open) return;
          const form = details.querySelector('form');
          if (!form || form.getBoundingClientRect().bottom <= window.innerHeight - 16) return;
          form.scrollIntoView({
            block: 'end',
            inline: 'nearest',
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
        });
      }}
    >
      {children}
    </details>
  );
}
