import { describe, expect, it } from 'vitest';

import { nextEntryName } from '@/features/scan-config/components/hooks/entry-name';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';

import type { ConfigSchema, TBlock } from '@/features/scan-config/types';

function dictionarySchema(singularName: string): ConfigSchema {
  return {
    properties: {
      distance_dependent_distributions: {
        ui_element: ScanConfigUIElementDict.BlockDictionary,
        singular_name: singularName,
        additionalProperties: { oneOf: [] },
      },
    },
  } as unknown as ConfigSchema;
}

function blockWithDefaultName(defaultName?: string): TBlock {
  return { title: 'T', description: 'D', default_name: defaultName } as unknown as TBlock;
}

describe('nextEntryName', () => {
  const schema = dictionarySchema('distribution');

  it("uses the dictionary's singular_name when no block is given", () => {
    expect(nextEntryName(schema, 'distance_dependent_distributions', new Set())).toBe(
      'Distribution 0'
    );
  });

  it("uses the dictionary's singular_name when the block has no default_name", () => {
    expect(
      nextEntryName(schema, 'distance_dependent_distributions', new Set(), blockWithDefaultName())
    ).toBe('Distribution 0');
  });

  it("prefers the child block's default_name when present", () => {
    expect(
      nextEntryName(
        schema,
        'distance_dependent_distributions',
        new Set(),
        blockWithDefaultName('step')
      )
    ).toBe('Step 0');
  });

  it('appends the first free counter against existing entries', () => {
    expect(
      nextEntryName(
        schema,
        'distance_dependent_distributions',
        new Set(['Step 0', 'Step 1']),
        blockWithDefaultName('step')
      )
    ).toBe('Step 2');
  });
});
