/**
 * Pure utility functions for resolving diff/flash types in the scan-config UI.
 *
 * These helpers are consumed by the various `use-*-diff` hooks so that the
 * original UI components stay free of diff-specific logic.
 */

import type { DiffType } from '@/utils/diff';
import type { ConfigHighlight, ActiveFlash } from '@/state/config-highlights';

// ── Dominant type resolution ─────────────────────────────────────────────────

/**
 * Given a set of diff types, resolve to a single dominant type.
 * 'replace' wins when there are mixed types.
 */
export function resolveDominantType(types: Set<DiffType>): DiffType | null {
  if (types.size === 0) return null;
  if (types.size > 1 || types.has('replace')) return 'replace';
  if (types.has('add')) return 'add';
  return 'remove';
}

// ── Root-element helpers ─────────────────────────────────────────────────────

/** Check whether any highlight touches a given root element. */
export function hasHighlightsForRoot(highlights: ConfigHighlight[], rootElement: string): boolean {
  return highlights.some((h) => h.path[0] === rootElement);
}

/** Resolve the dominant highlight type for a root element. */
export function resolveRootHighlightType(
  highlights: ConfigHighlight[],
  rootElement: string,
): DiffType | null {
  const types = new Set<DiffType>();
  for (const h of highlights) {
    if (h.path[0] === rootElement) types.add(h.type);
  }
  return resolveDominantType(types);
}

// ── Entry-level helpers ──────────────────────────────────────────────────────

/** Resolve the dominant highlight type for a dictionary entry. */
export function resolveEntryHighlightType(
  highlights: ConfigHighlight[],
  rootElement: string,
  entry: string,
): DiffType | null {
  const types = new Set<DiffType>();
  for (const h of highlights) {
    if (h.path.length >= 2 && h.path[0] === rootElement && h.path[1] === entry) {
      types.add(h.type);
    }
  }
  return resolveDominantType(types);
}

/** Collect unique entry names from highlights matching a given diff type. */
export function highlightedEntries(
  highlights: ConfigHighlight[],
  rootElement: string,
  type: DiffType,
  exclude?: Set<string>,
): string[] {
  const set = new Set<string>();
  for (const h of highlights) {
    if (h.path.length >= 2 && h.path[0] === rootElement && h.type === type) {
      const entry = h.path[1];
      if (!exclude || !exclude.has(entry)) set.add(entry);
    }
  }
  return Array.from(set);
}

// ── Field-level helpers ──────────────────────────────────────────────────────

/**
 * Look up the diff/flash type for a specific field.
 * Works for both dictionary entries (selectedEntry set) and single blocks.
 */
export function lookupFieldType(
  fieldName: string,
  rootElement: string | undefined,
  selectedEntry: string | undefined,
  entryLookup: (entry: string) => { type: DiffType } | undefined,
  fieldLookup: (key: string) => { type: DiffType } | undefined,
): DiffType | null {
  if (!rootElement) return null;

  if (selectedEntry) {
    const fieldResult = fieldLookup(`${selectedEntry}/${fieldName}`);
    if (fieldResult) return fieldResult.type;
    const entryResult = entryLookup(selectedEntry);
    if (entryResult && entryResult.type !== 'replace') return entryResult.type;
    return null;
  }

  const fieldResult = fieldLookup(fieldName);
  return fieldResult ? fieldResult.type : null;
}
