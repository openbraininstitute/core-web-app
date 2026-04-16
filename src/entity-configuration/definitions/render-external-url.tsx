import { EmptyValue } from '@/entity-configuration/definitions/empty-value';

import type { ReactNode } from 'react';

/** Renders an external URL as a link. Safe for Server Components (not from `renderer.tsx` `use client`). */
export function renderExternalUrl(
  url: unknown,
  options?: { className?: string; children?: ReactNode }
): ReactNode {
  if (url == null || url === '' || url === EmptyValue) return EmptyValue;
  const href = String(url).trim();
  if (href === '') return EmptyValue;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={options?.className ?? 'wrap-break-word text-primary-6 underline'}
    >
      {options?.children ?? href}
    </a>
  );
}
