/**
 * Utility functions for parsing JSONPatch operations from editstate tool calls
 */

import { compare } from 'fast-json-patch';

export type DiffType = 'add' | 'remove' | 'replace';

export interface JSONPatchOperation {
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
 * Parse JSONPatch operations from editstate tool arguments
 */
export function parseJSONPatches(patches: JSONPatchOperation[]): DiffResult[] {
  return patches.map((patch) => ({
    path: parseJSONPointer(patch.path),
    type: patch.op,
    value: patch.value,
    operation: patch,
  }));
}

/**
 * Parse a JSON Pointer (RFC 6901) into an array of path segments
 * Example: "/initialize/circuit/duration" -> ["initialize", "circuit", "duration"]
 */
function parseJSONPointer(pointer: string): string[] {
  if (pointer === '') return [];
  if (!pointer.startsWith('/')) return [];
  
  return pointer
    .slice(1) // Remove leading slash
    .split('/')
    .map((segment) => 
      // Unescape special characters per RFC 6901
      segment.replace(/~1/g, '/').replace(/~0/g, '~')
    );
}

/**
 * Get the top-level blocks that have changes
 */
export function getModifiedBlocks(diffs: DiffResult[]): Set<string> {
  const blocks = new Set<string>();
  for (const diff of diffs) {
    if (diff.path.length > 0) {
      blocks.add(diff.path[0]);
    }
  }
  return blocks;
}

/**
 * Get field-level changes for a specific entry within a block
 * Example: For path ['stimuli', 'sync_spike', 'delay'], returns the field 'delay' change
 */
export function getFieldChangesForEntry(
  diffs: DiffResult[],
  blockName: string,
  entryName: string
): Array<{
  fieldPath: string[]; // Path within the entry (e.g., ['delay'] or ['node_set', 'population'])
  type: DiffType;
  oldValue?: unknown;
  newValue?: unknown;
}> {
  return diffs
    .filter((diff) => 
      diff.path.length >= 3 && 
      diff.path[0] === blockName && 
      diff.path[1] === entryName
    )
    .map((diff) => ({
      fieldPath: diff.path.slice(2), // Remove block and entry name, keep field path
      type: diff.type,
      oldValue: diff.type === 'remove' ? diff.value : undefined,
      newValue: diff.type === 'add' || diff.type === 'replace' ? diff.value : undefined,
    }));
}

/**
 * Merge two sets of diffs, with later changes overriding earlier ones
 * This is useful for accumulating diffs across multiple editstate calls
 * 
 * @param diffs1 - Earlier set of diffs
 * @param diffs2 - Later set of diffs (takes precedence)
 * @returns Merged diffs with later changes overriding earlier ones
 */
export function mergeDiffs(diffs1: DiffResult[], diffs2: DiffResult[]): DiffResult[] {
  // Create a map of path -> diff for quick lookup
  const pathToDiff = new Map<string, DiffResult>();
  
  // Helper to create a unique key from a path array
  const pathKey = (path: string[]): string => path.join('/');
  
  // Add all diffs from the first set
  for (const diff of diffs1) {
    pathToDiff.set(pathKey(diff.path), diff);
  }
  
  // Add/override with diffs from the second set
  for (const diff of diffs2) {
    const key = pathKey(diff.path);
    const existingDiff = pathToDiff.get(key);
    
    if (existingDiff) {
      // Handle operation combinations
      if (existingDiff.type === 'add' && diff.type === 'remove') {
        // Add followed by remove = no change, remove both
        pathToDiff.delete(key);
      } else if (existingDiff.type === 'remove' && diff.type === 'add') {
        // Remove followed by add = replace
        pathToDiff.set(key, {
          ...diff,
          type: 'replace',
        });
      } else {
        // For all other cases, later operation wins
        pathToDiff.set(key, diff);
      }
    } else {
      // New path, just add it
      pathToDiff.set(key, diff);
    }
  }
  
  // Convert map back to array
  return Array.from(pathToDiff.values());
}

/**
 * Adjust parent node types based on their children
 * If a parent has type 'add', all its children should also be 'add'
 * This handles the case where a node is added and then modified in the same message
 */
export function adjustParentTypes(diffs: DiffResult[]): DiffResult[] {
  const pathKey = (path: string[]): string => path.join('/');
  const diffMap = new Map<string, DiffResult>();
  
  // Build a map of all diffs
  for (const diff of diffs) {
    diffMap.set(pathKey(diff.path), diff);
  }
  
  // Find all parent nodes with 'add' type
  const addedParents = diffs.filter((diff) => diff.type === 'add');
  
  // For each added parent, change all its descendants to 'add' as well
  const adjustedDiffs = diffs.map((diff) => {
    // Check if this diff is a descendant of any added parent
    for (const parent of addedParents) {
      // Skip if this is the parent itself
      if (pathKey(diff.path) === pathKey(parent.path)) continue;
      
      // Check if this diff's path starts with the parent's path
      if (diff.path.length > parent.path.length) {
        let isDescendant = true;
        for (let i = 0; i < parent.path.length; i++) {
          if (diff.path[i] !== parent.path[i]) {
            isDescendant = false;
            break;
          }
        }
        
        // If this is a descendant of an added parent, change it to 'add'
        if (isDescendant) {
          return {
            ...diff,
            type: 'add' as DiffType,
          };
        }
      }
    }
    
    return diff;
  });
  
  return adjustedDiffs;
}

/**
 * Compute live diffs between two config objects using fast-json-patch.
 * Used when restoring state to show the real difference between the
 * current (possibly user-modified) config and the state being restored.
 *
 * @param currentConfig - The current live config (before restore)
 * @param restoredConfig - The config being restored
 * @returns DiffResult[] with real-time diffs
 */
export function computeLiveDiffs(
  currentConfig: Record<string, unknown>,
  restoredConfig: Record<string, unknown>
): DiffResult[] {
  const patches = compare(currentConfig, restoredConfig);

  // Filter to only add/remove/replace (skip move/copy/test)
  return patches
    .filter((p): p is { op: DiffType; path: string; value?: unknown } =>
      p.op === 'add' || p.op === 'remove' || p.op === 'replace'
    )
    .map((patch) => ({
      path: parseJSONPointer(patch.path),
      type: patch.op,
      value: patch.value,
      operation: patch as JSONPatchOperation,
    }));
}
