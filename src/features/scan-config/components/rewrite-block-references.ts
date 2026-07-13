import { isPlainObject } from '@/features/scan-config/components/utils';

/**
 * A block reference is a plain object with a string `block_name` (and usually
 * `block_dict_name`). Used by `reference` fields and nested inside
 * `combined_with` (`neuron_set_combination`) tuples: `[ref | null, operation]`.
 */
function isBlockReference(value: unknown): value is { block_name: string } {
  return isPlainObject(value) && typeof value.block_name === 'string';
}

export const RewriteBlockReferencesModeDict = {
  Clear: 'clear',
  Rename: 'rename',
} as const;

export type TRewriteBlockReferencesModeDict =
  (typeof RewriteBlockReferencesModeDict)[keyof typeof RewriteBlockReferencesModeDict];

export type RewriteBlockReferencesMode =
  | { type: typeof RewriteBlockReferencesModeDict.Clear }
  | { type: typeof RewriteBlockReferencesModeDict.Rename; to: string };

/**
 * Walk a config subtree and rewrite every BlockReference whose `block_name`
 * matches `matchName`.
 *
 * Semantics mirror the historical shallow cleanup, extended for nested arrays:
 * - object-owned ref + clear  → `delete parent[key]` (same as recordings /
 *   `base_neuron_set` today — field falls back to schema default)
 * - array-owned ref + clear   → set the slot to `null` (keeps combination
 *   tuples as `[null, op]`, matching the UI "Default" value; never `delete`
 *   an index — that would sparse-hole the array and break `[ref, op]` reads)
 * - rename                    → mutate `block_name` in place
 *
 * Non-ref plain objects and arrays are recursed into. Primitives are ignored.
 */
export function rewriteBlockReferences(
  node: unknown,
  matchName: string,
  mode: RewriteBlockReferencesMode
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const item = node[i];
      if (isBlockReference(item) && item.block_name === matchName) {
        if (mode.type === RewriteBlockReferencesModeDict.Clear) {
          node[i] = null;
        } else {
          item.block_name = mode.to;
        }
      } else {
        rewriteBlockReferences(item, matchName, mode);
      }
    }
    return;
  }

  if (!isPlainObject(node)) return;

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (isBlockReference(value) && value.block_name === matchName) {
      if (mode.type === RewriteBlockReferencesModeDict.Clear) {
        delete node[key];
      } else {
        value.block_name = mode.to;
      }
    } else {
      rewriteBlockReferences(value, matchName, mode);
    }
  }
}
