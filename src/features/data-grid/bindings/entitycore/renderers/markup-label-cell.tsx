import { SafeSubSupHtml } from '@/ui/atoms/safe-sub-sup-html';
import { stripHtmlTags } from '@/utils/safe-html-markup';

import { EMPTY_PLACEHOLDER } from '../../../renderers/aggrid/empty-cell';

import type { ICellRendererProps } from '../../../react';

/** Cell-renderer registry key for IUPHAR-style sub/sup labels. */
export const MARKUP_LABEL_RENDERER = 'markupLabel';

/**
 * Renders ion-channel (and similar) labels that may include `<SUB>` / `<SUP>`
 * markup from the API. Plain strings pass through unchanged.
 */
export function MarkupLabelCell({ value }: ICellRendererProps<unknown>) {
  const text = typeof value === 'string' ? value : '';
  if (!text.trim()) return <span className="text-gray-300">{EMPTY_PLACEHOLDER}</span>;
  return (
    <SafeSubSupHtml
      html={text}
      className="min-w-0 truncate text-primary-8"
      title={stripHtmlTags(text)}
    />
  );
}
