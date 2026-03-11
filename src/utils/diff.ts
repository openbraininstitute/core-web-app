/**
 * Utility functions for parsing JSONPatch operations from editstate tool calls
 */

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
