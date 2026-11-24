import { isPlainObject } from '@/features/scan-config/components/utils';

/**
 * A block reference is a plain object with a string `block_name` (and usually
 * `block_dict_name`). Used by `reference` fields and nested inside
 * `combined_with` (`neuron_set_combination`) tuples: `[ref | null, operation]`.
 */
function isBlockReference(value: unknown): value is { block_name: string } {
  return isPlainObject(value) && typeof value.block_name === 'string';
}

export type TBlockTarget = { dictionary: string; name: string };

/** True when `value` references `target`; a reference without `block_dict_name` matches on name. */
export function referencesBlock(
  value: unknown,
  target: TBlockTarget
): value is { block_name: string } {
  if (!isBlockReference(value) || value.block_name !== target.name) return false;
  const dictionary = (value as { block_dict_name?: unknown }).block_dict_name;
  return typeof dictionary !== 'string' || dictionary === '' || dictionary === target.dictionary;
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
 * Walk a config subtree and rewrite every BlockReference to `target`
 * (its dictionary and its name).
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
  target: TBlockTarget,
  mode: RewriteBlockReferencesMode
): void {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) {
      const item = node[i];
      if (referencesBlock(item, target)) {
        if (mode.type === RewriteBlockReferencesModeDict.Clear) {
          node[i] = null;
        } else {
          item.block_name = mode.to;
        }
      } else {
        rewriteBlockReferences(item, target, mode);
      }
    }
    return;
  }

  if (!isPlainObject(node)) return;

  for (const key of Object.keys(node)) {
    const value = node[key];
    if (referencesBlock(value, target)) {
      if (mode.type === RewriteBlockReferencesModeDict.Clear) {
        delete node[key];
      } else {
        value.block_name = mode.to;
      }
    } else {
      rewriteBlockReferences(value, target, mode);
    }
  }
}
