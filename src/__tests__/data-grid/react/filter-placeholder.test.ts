import { describe, expect, it } from 'vitest';

import {
  createDefaultOperatorRegistry,
  FilterOptionsKind,
  FreeEntryKind,
  OperatorId,
} from '@/features/data-grid/core';
import { parseIdTokens, splitIdTokens } from '@/features/data-grid/react/filters/id-tokens';
import {
  FREE_ENTRY_SEPARATOR_HINT,
  resolveFilterPlaceholder,
} from '@/features/data-grid/react/filters/placeholder';

import type { IFilterTarget } from '@/features/data-grid/core';

const operators = createDefaultOperatorRegistry();

function target(over: Partial<IFilterTarget> = {}): IFilterTarget {
  return { id: 'strain', label: 'Strain', field: 'subject__strain__name', operators: [], ...over };
}

describe('resolveFilterPlaceholder', () => {
  it('an explicit placeholder always wins, whatever the operator', () => {
    const t = target({ placeholder: 'Paste one or more acronyms, like SSp-bfd' });
    for (const op of [OperatorId.In, OperatorId.Eq, OperatorId.Ilike, OperatorId.Gte]) {
      expect(resolveFilterPlaceholder(t, operators.get(op))).toBe(
        'Paste one or more acronyms, like SSp-bfd'
      );
    }
  });

  it('only says "ids" when the target actually collects ids', () => {
    // no options + no freeEntry override => an id target (the historical default)
    expect(resolveFilterPlaceholder(target({ id: 'id' }), operators.get(OperatorId.In))).toBe(
      'Paste one or more ids, like 3fa85f64-5717-4562-b3fc-2c963f66afa6'
    );

    // a text free-entry target must NOT claim ids
    const strains = target({ freeEntry: FreeEntryKind.Text });
    expect(resolveFilterPlaceholder(strains, operators.get(OperatorId.In))).toBe(
      'Enter one or more values'
    );
    expect(resolveFilterPlaceholder(strains, operators.get(OperatorId.NotIn))).toBe(
      'Enter one or more values'
    );

    // a facet picker is not free entry either
    const faceted = target({ options: { kind: FilterOptionsKind.Facets } });
    expect(resolveFilterPlaceholder(faceted, operators.get(OperatorId.In))).toBe(
      'Enter one or more values'
    );
  });

  it('a single-value operator asks for a value, not a list', () => {
    // the `brain_region__annotation_value` shape from the cell-morphology schema
    const annotation = target({ id: 'annotationValue', field: 'brain_region__annotation_value' });
    expect(resolveFilterPlaceholder(annotation, operators.get(OperatorId.Eq))).toBe(
      'Enter a value'
    );
    expect(resolveFilterPlaceholder(annotation, operators.get(OperatorId.Ilike))).toBe(
      'Enter text to match'
    );
    expect(resolveFilterPlaceholder(annotation, operators.get(OperatorId.Contains))).toBe(
      'Enter text to match'
    );
    expect(resolveFilterPlaceholder(annotation, operators.get(OperatorId.Gte))).toBe(
      'Enter a number'
    );
  });

  it('never restates the field label and never uses an "e.g." prefix', () => {
    for (const op of [OperatorId.In, OperatorId.Eq, OperatorId.Ilike, OperatorId.Gte]) {
      const text = resolveFilterPlaceholder(target(), operators.get(op));
      expect(text.toLowerCase()).not.toContain('e.g.');
      expect(text.toLowerCase()).not.toContain('strain');
    }
  });
});

describe('FREE_ENTRY_SEPARATOR_HINT matches what the parser accepts', () => {
  // The hint claims spaces, commas, semicolons and new lines. Each must really split.
  it.each([
    ['spaces', 'a b c'],
    ['commas', 'a,b,c'],
    ['semicolons', 'a;b;c'],
    ['new lines', 'a\nb\nc'],
    ['tabs (whitespace)', 'a\tb\tc'],
    ['a mixture', 'a, b;\nc'],
  ])('splits on %s', (_name, input) => {
    expect(parseIdTokens(input)).toEqual(['a', 'b', 'c']);
  });

  it('states every separator the parser honours, and no more', () => {
    expect(FREE_ENTRY_SEPARATOR_HINT).toBe(
      'Separate values with spaces, commas, semicolons or new lines.'
    );
    // a character the hint does NOT claim must not split
    expect(parseIdTokens('a|b')).toEqual(['a|b']);
  });
});

describe('splitIdTokens — free-entry kind', () => {
  const UUID = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

  it('defaults to uuid validation (unchanged behaviour)', () => {
    expect(splitIdTokens(`${UUID}, nope`)).toEqual({
      tokens: [UUID, 'nope'],
      valid: [UUID],
      invalid: ['nope'],
    });
  });

  it('text targets accept every token, so nothing ever blocks Apply', () => {
    expect(splitIdTokens('C57BL/6J, Wistar', FreeEntryKind.Text)).toEqual({
      tokens: ['C57BL/6J', 'Wistar'],
      valid: ['C57BL/6J', 'Wistar'],
      invalid: [],
    });
  });
});
