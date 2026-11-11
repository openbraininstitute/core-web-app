/**
 * Utility functions for diffing config objects using fast-json-patch
 */

import { compare } from 'fast-json-patch';

export type DiffType = 'add' | 'remove' | 'replace';

interface JSONPatchOperation {
  op: DiffType;
  path: string;
  value?: unknown;
}

export interface DiffResult {
  path: string[];
  type: DiffType;
  value?: unknown;
  operation: JSONPatchOperation;
}

/**
 * Parse a JSON Pointer (RFC 6901) into an array of path segments
 * Example: "/initialize/circuit/duration" -> ["initialize", "circuit", "duration"]
 */
function parseJSONPointer(pointer: string): string[] {
  if (pointer === '' || !pointer.startsWith('/')) return [];

  return pointer
    .slice(1)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));
}

/**
 * Adjust parent node types based on their children.
 * If a parent has type 'add', all its descendants should also be 'add'.
 */
export function adjustParentTypes(diffs: DiffResult[]): DiffResult[] {
  const pathKey = (path: string[]): string => path.join('/');
  const addedParents = diffs.filter((diff) => diff.type === 'add');

  return diffs.map((diff) => {
    for (const parent of addedParents) {
      if (pathKey(diff.path) === pathKey(parent.path)) continue;

      if (diff.path.length > parent.path.length) {
        let isDescendant = true;
        for (let i = 0; i < parent.path.length; i++) {
          if (diff.path[i] !== parent.path[i]) {
            isDescendant = false;
            break;
          }
        }
        if (isDescendant) {
          return { ...diff, type: 'add' as DiffType };
        }
      }
    }
    return diff;
  });
}

/**
 * Compute diffs between two config objects using fast-json-patch.
 * Used for both the show-diff flow (old vs new after LLM edits) and
 * the restore flow (current live vs restored snapshot).
 *
 * Section-level add/remove ops (path.length === 1) are expanded into
 * child-level diffs so the UI can highlight individual entries.
 * Empty section removes are skipped (noise from schema-defined defaults).
 */
export function computeLiveDiffs(
  currentConfig: Record<string, unknown>,
  restoredConfig: Record<string, unknown>
): DiffResult[] {
  // Normalize: treat null and {} as equivalent for top-level sections.
  // The LLM may set a section to null while resetConfig materialises it as {}.
  const normalise = (cfg: Record<string, unknown>): Record<string, unknown> => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (v === null || v === undefined) {
        out[k] = {};
      } else {
        out[k] = v;
      }
    }
    return out;
  };

  const patches = compare(normalise(currentConfig), normalise(restoredConfig));
  const results: DiffResult[] = [];

  for (const patch of patches) {
    if (patch.op !== 'add' && patch.op !== 'remove' && patch.op !== 'replace') continue;

    const path = parseJSONPointer(patch.path);
    const op = patch.op as DiffType;

    // Skip empty section removes (schema-defined sections as empty `{}`)
    if (op === 'remove' && path.length === 1) {
      const sourceObj = currentConfig[path[0]];
      if (
        !sourceObj ||
        typeof sourceObj !== 'object' ||
        Array.isArray(sourceObj) ||
        Object.keys(sourceObj as Record<string, unknown>).length === 0
      ) {
        continue;
      }
    }

    // Expand root-level add/remove/replace into child-level diffs
    if (path.length === 1) {
      const newVal = (patch as { value?: unknown }).value;
      const oldObj = currentConfig[path[0]];

      const oldIsObj = oldObj && typeof oldObj === 'object' && !Array.isArray(oldObj);
      const newIsObj = newVal && typeof newVal === 'object' && !Array.isArray(newVal);

      if (oldIsObj || newIsObj) {
        const oldChildren = oldIsObj ? (oldObj as Record<string, unknown>) : {};
        const newChildren = newIsObj ? (newVal as Record<string, unknown>) : {};
        const oldKeys = new Set(Object.keys(oldChildren));
        const newKeys = new Set(Object.keys(newChildren));
        const childDiffs: DiffResult[] = [];

        for (const key of oldKeys) {
          if (!newKeys.has(key)) {
            childDiffs.push({
              path: [...path, key],
              type: 'remove',
              value: undefined,
              operation: patch as JSONPatchOperation,
            });
          }
        }
        for (const key of newKeys) {
          if (!oldKeys.has(key)) {
            childDiffs.push({
              path: [...path, key],
              type: 'add',
              value: newChildren[key],
              operation: patch as JSONPatchOperation,
            });
          }
        }
        for (const key of oldKeys) {
          if (!newKeys.has(key)) continue;
          if (JSON.stringify(oldChildren[key]) !== JSON.stringify(newChildren[key])) {
            childDiffs.push({
              path: [...path, key],
              type: 'replace',
              value: newChildren[key],
              operation: patch as JSONPatchOperation,
            });
          }
        }

        if (childDiffs.length > 0) {
          const childTypes = new Set(childDiffs.map((c) => c.type));
          const parentType: DiffType =
            childTypes.size > 1 || childTypes.has('replace')
              ? 'replace'
              : childTypes.has('add')
                ? 'add'
                : 'remove';
          results.push({
            path,
            type: parentType,
            value: newVal,
            operation: patch as JSONPatchOperation,
          });
          results.push(...childDiffs);
          continue;
        }
      }
    }

    results.push({
      path,
      type: op,
      value: (patch as { value?: unknown }).value,
      operation: patch as JSONPatchOperation,
    });
  }

  return results;
}
