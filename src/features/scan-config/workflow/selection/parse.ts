/**
 * validates and parses workflow selection payloads stored in sessionStorage
 *
 * payloads are versioned JSON objects (`TWorkflowSelectionPayload`) written before
 * navigating to a configure route
 * invalid or legacy shapes return `null` rather than throwing
 */

import {
  type TWorkflowGroupedSelection,
  type TWorkflowListSelection,
  type TWorkflowSelection,
  type TWorkflowSelectionPayload,
  type TWorkflowSelectionRef,
  type TWorkflowSingleSelection,
  WorkflowSelectionMode,
} from './types';

function parseSelectionRef(value: unknown): TWorkflowSelectionRef | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.type !== 'string' || typeof record.id !== 'string') {
    return null;
  }

  if (!record.id.trim()) {
    return null;
  }

  return {
    type: record.type as TWorkflowSelectionRef['type'],
    id: record.id,
  };
}

function parseSelectionRefs(items: unknown, minLength: number): TWorkflowSelectionRef[] | null {
  if (!Array.isArray(items) || items.length < minLength) {
    return null;
  }

  const refs: TWorkflowSelectionRef[] = [];
  for (const item of items) {
    const ref = parseSelectionRef(item);
    if (!ref) {
      return null;
    }
    refs.push(ref);
  }

  return refs;
}

function parseOptionalGroupName(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined;
}

const selectionModeParsers = {
  [WorkflowSelectionMode.Single]: (
    selectionRecord: Record<string, unknown>
  ): TWorkflowSingleSelection | null => {
    const items = parseSelectionRefs(selectionRecord.items, 1);
    if (!items || items.length !== 1) {
      return null;
    }

    return {
      mode: WorkflowSelectionMode.Single,
      items: [items[0]],
    };
  },
  [WorkflowSelectionMode.List]: (
    selectionRecord: Record<string, unknown>
  ): TWorkflowListSelection | null => {
    const items = parseSelectionRefs(selectionRecord.items, 1);
    if (!items) {
      return null;
    }

    return {
      mode: WorkflowSelectionMode.List,
      items,
    };
  },
  [WorkflowSelectionMode.Grouped]: (
    selectionRecord: Record<string, unknown>
  ): TWorkflowGroupedSelection | null => {
    const groupsRaw = selectionRecord.groups;
    if (!Array.isArray(groupsRaw) || groupsRaw.length < 1) {
      return null;
    }

    const groups: TWorkflowGroupedSelection['groups'] = [];
    for (const groupRaw of groupsRaw) {
      if (!groupRaw || typeof groupRaw !== 'object') {
        return null;
      }

      const groupRecord = groupRaw as Record<string, unknown>;
      const items = parseSelectionRefs(groupRecord.items, 1);
      if (!items) {
        return null;
      }

      groups.push({
        name: parseOptionalGroupName(groupRecord.name),
        items,
      });
    }

    return {
      mode: WorkflowSelectionMode.Grouped,
      groups,
    };
  },
} satisfies Record<
  (typeof WorkflowSelectionMode)[keyof typeof WorkflowSelectionMode],
  (selectionRecord: Record<string, unknown>) => TWorkflowSelection | null
>;

function isWorkflowSelectionMode(mode: unknown): mode is keyof typeof selectionModeParsers {
  return (
    mode === WorkflowSelectionMode.Single ||
    mode === WorkflowSelectionMode.List ||
    mode === WorkflowSelectionMode.Grouped
  );
}

/**
 * parse a raw sessionStorage JSON string into a typed workflow selection payload
 *
 * @param raw - serialized payload from `writeWorkflowSelection`
 * @returns parsed payload, or `null` when json is invalid, version mismatches, or shape fails validation
 */
export function parseWorkflowSelectionPayload(raw: string): TWorkflowSelectionPayload | null {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const record = parsed as Record<string, unknown>;
    const selection = record.selection;
    if (!selection || typeof selection !== 'object') {
      return null;
    }

    const selectionRecord = selection as Record<string, unknown>;
    const { mode } = selectionRecord;

    if (!isWorkflowSelectionMode(mode)) {
      return null;
    }

    const parsedSelection = selectionModeParsers[mode](selectionRecord);
    if (!parsedSelection) {
      return null;
    }

    return {
      selection: parsedSelection,
    };
  } catch {
    return null;
  }
}

/**
 * resolve the primary entity ref for session-backed configure workflows
 *
 * uses the first item in single/list mode, or the first item of the first group in grouped mode
 *
 * @returns the primary ref, or `null` when the selection has no items
 */
export function getPrimarySelectionRef(
  payload: TWorkflowSelectionPayload
): TWorkflowSelectionRef | null {
  const { selection } = payload;

  switch (selection.mode) {
    case WorkflowSelectionMode.Single:
      return selection.items[0];
    case WorkflowSelectionMode.List:
      return selection.items[0] ?? null;
    case WorkflowSelectionMode.Grouped:
      return selection.groups[0]?.items[0] ?? null;
  }
}

/**
 * return the sole entity ref from a single-selection payload
 *
 * @throws {Error} when the payload is not in `WorkflowSelectionMode.Single` or has no ref
 */
export function getSingleSelectionEntityId(
  payload: TWorkflowSelectionPayload
): TWorkflowSelectionRef {
  const ref = getPrimarySelectionRef(payload);
  if (!ref || payload.selection.mode !== WorkflowSelectionMode.Single) {
    throw new Error('expected single selection workflow payload');
  }
  return ref;
}
