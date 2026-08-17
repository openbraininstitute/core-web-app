'use client';

import { cn } from '@/utils/css-class';
import { sanitizeSubSupHtml } from '@/utils/safe-html-markup';

/**
 * Renders IUPHAR-style labels (`K<SUB>v</SUB>10.1`) with real sub/sup, escaping
 * every other tag. Use for facet pickers and ion-channel label cells.
 */
export function SafeSubSupHtml({
  html,
  className,
  title,
}: {
  html: string;
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn('[&_sub]:bottom-[-0.15em]', className)}
      title={title}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized to sub/sup only
      dangerouslySetInnerHTML={{ __html: sanitizeSubSupHtml(html) }}
    />
  );
}
