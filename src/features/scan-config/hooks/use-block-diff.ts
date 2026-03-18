/**
 * Hook that resolves field-level diff/flash visual state for a Block.
 *
 * Extracts the diff-specific logic that was previously inline in block.tsx
 * so the component stays focused on rendering form fields.
 */

import { useAtomValue } from 'jotai';
import { activeFlashesAtom, configDiffsAtom } from '@/state/config-highlights';
import { getDiffClassName } from '@/utils/diff-class';
import { lookupFieldType } from '../diff-helpers';

import type { DiffType } from '@/utils/diff';

export interface BlockDiffHelpers {
  /**
   * Returns the resolved CSS class for a field's diff border.
   * Flash animation takes priority over persistent highlight.
   */
  getFieldDiffClass: (fieldName: string) => string | undefined;
}

export function useBlockDiff(
  rootElement?: string,
  selectedEntry?: string,
): BlockDiffHelpers {
  const diffs = useAtomValue(configDiffsAtom);
  const activeFlashes = useAtomValue(activeFlashesAtom);

  const getFieldDiffClass = (fieldName: string): string | undefined => {
    // Flash type (temporary animation)
    const flash = rootElement ? activeFlashes.get(rootElement) : undefined;
    const flashType: DiffType | null = flash?.fields
      ? lookupFieldType(
          fieldName,
          rootElement,
          selectedEntry,
          (entry) => flash.entries.get(entry),
          (key) => flash.fields.get(key),
        )
      : null;

    // Persistent diff type
    const changeType: DiffType | null =
      diffs.length === 0
        ? null
        : lookupFieldType(
            fieldName,
            rootElement,
            selectedEntry,
            (entry) =>
              diffs.find(
                (d) => d.path.length === 2 && d.path[0] === rootElement && d.path[1] === entry,
              ),
            selectedEntry
              ? (key) => {
                  const field = key.slice(key.indexOf('/') + 1);
                  return diffs.find(
                    (d) =>
                      d.path.length >= 3 &&
                      d.path[0] === rootElement &&
                      d.path[1] === selectedEntry &&
                      d.path[2] === field,
                  );
                }
              : (key) =>
                  diffs.find(
                    (d) => d.path.length >= 2 && d.path[0] === rootElement && d.path[1] === key,
                  ),
          );

    // Flash takes priority over persistent diff
    return getDiffClassName(flashType, 'flash-fast') ?? getDiffClassName(changeType, 'highlight');
  };

  return { getFieldDiffClass };
}
