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
  const patches = compare(currentConfig, restoredConfig);
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

    // Expand root-level add/remove into child-level diffs
    if ((op === 'remove' || op === 'add') && path.length === 1) {
      const sourceObj =
        op === 'remove' ? currentConfig[path[0]] : (patch as { value?: unknown }).value;

      if (sourceObj && typeof sourceObj === 'object' && !Array.isArray(sourceObj)) {
        results.push({
          path,
          type: op,
          value: (patch as { value?: unknown }).value,
          operation: patch as JSONPatchOperation,
        });
        for (const childKey of Object.keys(sourceObj)) {
          results.push({
            path: [...path, childKey],
            type: op,
            value:
              op === 'add'
                ? (sourceObj as Record<string, unknown>)[childKey]
                : undefined,
            operation: patch as JSONPatchOperation,
          });
        }
        continue;
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
