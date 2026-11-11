import type { DiffType } from './diff';

/**
 * Maps a diff type to the corresponding global CSS class name from diff-highlights.css.
 *
 * Variants:
 *  - "highlight"      → static border (View Diffs toggle)
 *  - "highlight-selected" → static border + inset ring (selected entry)
 *  - "flash-slow"     → 2 s fade-out animation (root elements & dictionary entries)
 *  - "flash-fast"     → 1.2 s fade-out animation (individual block fields)
 */
type DiffClassVariant = 'highlight' | 'highlight-selected' | 'flash-slow' | 'flash-fast';

const LABEL: Record<DiffType, string> = {
  add: 'added',
  remove: 'removed',
  replace: 'modified',
};

export function getDiffClassName(
  type: DiffType | null | undefined,
  variant: DiffClassVariant
): string | undefined {
  if (!type) return undefined;
  return `diff-${variant}-${LABEL[type]}`;
}
