import { describe, expect, it } from 'vitest';

import { ScanConfigUIElementDict, SchemaNameDict } from '@/features/scan-config/types';
import {
  canSelectWithinCap,
  formatSelectionCap,
  isOverSelectionCap,
  limitNewPicks,
  readFieldMaxItems,
} from '@/features/scan-config/workflow/selection-cap';
import {
  parseWorkflowSchemaSelection,
  WorkflowSchemaSelectionMode,
} from '@/features/scan-config/workflow/workflow-schema-selection';

import type { ConfigSchema } from '@/features/scan-config/types';

function initializeSchema(field: Record<string, unknown>) {
  return {
    properties: {
      initialize: {
        ui_element: ScanConfigUIElementDict.BlockSingle,
        properties: { recordings: field },
      },
    },
  } as unknown as ConfigSchema;
}

describe('readFieldMaxItems', () => {
  it('reads a numeric maxItems and ignores anything else', () => {
    expect(readFieldMaxItems({ maxItems: 3 })).toBe(3);
    expect(readFieldMaxItems({})).toBeUndefined();
    expect(readFieldMaxItems({ maxItems: '3' })).toBeUndefined();
  });
});

describe('canSelectWithinCap', () => {
  it('allows every pick without a cap', () => {
    expect(
      canSelectWithinCap({ selected: false, selectedCount: 10, maxSelections: undefined })
    ).toBe(true);
  });

  it('allows picks below the cap and blocks new ones at it', () => {
    expect(canSelectWithinCap({ selected: false, selectedCount: 2, maxSelections: 3 })).toBe(true);
    expect(canSelectWithinCap({ selected: false, selectedCount: 3, maxSelections: 3 })).toBe(false);
  });

  it('keeps a picked row selectable so it can be unpicked, even over the cap', () => {
    expect(canSelectWithinCap({ selected: true, selectedCount: 4, maxSelections: 3 })).toBe(true);
  });
});

describe('isOverSelectionCap', () => {
  it('is only over when the count exceeds the cap', () => {
    expect(isOverSelectionCap(3, 3)).toBe(false);
    expect(isOverSelectionCap(4, 3)).toBe(true);
    expect(isOverSelectionCap(4, undefined)).toBe(false);
  });
});

describe('limitNewPicks', () => {
  const rows = (...ids: string[]) => ids.map((id) => ({ id }));

  it('keeps current picks and adds new ones only up to the room left', () => {
    expect(
      limitNewPicks({ rows: rows('a', 'b', 'c', 'd'), currentRows: rows('a'), room: 3 })
    ).toEqual(rows('a', 'b', 'c'));
  });

  it('never drops a current pick, even over the cap', () => {
    expect(
      limitNewPicks({
        rows: rows('a', 'b', 'c', 'd', 'e'),
        currentRows: rows('a', 'b', 'c', 'd'),
        room: 3,
      })
    ).toEqual(rows('a', 'b', 'c', 'd'));
  });

  it('passes everything through without a cap', () => {
    expect(limitNewPicks({ rows: rows('a', 'b'), currentRows: [], room: undefined })).toEqual(
      rows('a', 'b')
    );
  });
});

describe('formatSelectionCap', () => {
  it('reads as count over cap', () => {
    expect(formatSelectionCap(2, 3)).toBe('2 / 3 selected (max 3 allowed)');
  });
});

describe('parseWorkflowSchemaSelection cap', () => {
  const schemaName = SchemaNameDict.IonChannelFittingScanConfig;

  it('carries the multi-select field maxItems as maxSelections', () => {
    const selection = parseWorkflowSchemaSelection({
      schema: initializeSchema({
        ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple,
        maxItems: 3,
      }),
      schemaName,
    });

    expect(selection.selectionMode).toBe(WorkflowSchemaSelectionMode.Multiple);
    expect(selection).toMatchObject({ maxSelections: 3 });
  });

  it('has no cap when the field declares none', () => {
    const selection = parseWorkflowSchemaSelection({
      schema: initializeSchema({ ui_element: ScanConfigUIElementDict.ModelIdentifierMultiple }),
      schemaName,
    });

    expect(selection).toMatchObject({ maxSelections: undefined });
  });
});
