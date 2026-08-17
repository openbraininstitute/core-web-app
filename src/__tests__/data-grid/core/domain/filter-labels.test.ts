import { describe, expect, it } from 'vitest';

import {
  advancedFilterKey,
  FilterOptionsKind,
  FilterValueKind,
  FreeEntryKind,
  filterOptionLabeler,
  filterTargetForEntry,
  OperatorId,
  summarizeFilter,
  summarizeFilterEntry,
} from '@/features/data-grid/core';

import type {
  IAdvancedFilterGroup,
  IFilterEntry,
  IFilterTarget,
  IGridSchema,
  TFacets,
} from '@/features/data-grid/core';

interface Row {
  id: string;
}

const GENERATION_TYPE: IFilterTarget = {
  id: 'generationType',
  label: 'Generation type',
  field: 'cell_morphology_protocol__generation_type',
  operators: [OperatorId.In, OperatorId.Eq],
  options: {
    kind: FilterOptionsKind.Static,
    items: [
      { id: 'modified_reconstruction', label: 'Modified reconstruction' },
      { id: 'digital_reconstruction', label: 'Digital reconstruction' },
      { id: 'placeholder', label: 'Placeholder' },
      { id: 'computational_model', label: 'Computational model' },
    ],
  },
};

const MTYPE: IFilterTarget = {
  id: 'mtype',
  label: 'M-type',
  field: 'mtype__pref_label',
  facetKey: 'mtype',
  operators: [OperatorId.In],
  options: { kind: FilterOptionsKind.Facets },
};

const PROTOCOL_IDS: IFilterTarget = {
  id: 'protocolId',
  label: 'Protocol ID',
  field: 'cell_morphology_protocol__id',
  operators: [OperatorId.In],
};

const facets: TFacets = {
  mtype: [
    { id: 'uuid-1', label: 'L5_TPC:A', count: 12 },
    { id: 'uuid-2', label: 'L23_MC', count: 4 },
  ],
};

const setEntry = (values: string[], targetId?: string): IFilterEntry => ({
  columnId: 'x',
  operator: OperatorId.In,
  targetId,
  value: { kind: FilterValueKind.Set, values },
});

const textEntry = (text: string, targetId?: string): IFilterEntry => ({
  columnId: 'x',
  operator: OperatorId.Eq,
  targetId,
  value: { kind: FilterValueKind.Text, text },
});

describe('filterOptionLabeler — static options', () => {
  it('resolves a stored option id to its label', () => {
    const labelOf = filterOptionLabeler(GENERATION_TYPE);
    expect(labelOf?.('modified_reconstruction')).toBe('Modified reconstruction');
  });

  it('summarizes an exact-match enum as the LABEL, not the wire id', () => {
    const summary = summarizeFilter(
      textEntry('modified_reconstruction'),
      filterOptionLabeler(GENERATION_TYPE)
    );
    expect(summary).toBe('Modified reconstruction');
  });

  it('joins several selected options readably', () => {
    const summary = summarizeFilter(
      setEntry(['modified_reconstruction', 'placeholder']),
      filterOptionLabeler(GENERATION_TYPE)
    );
    expect(summary).toBe('Modified reconstruction, Placeholder');
  });

  it('caps a long selection with "+N more" instead of running off the panel', () => {
    const summary = summarizeFilter(
      setEntry([
        'modified_reconstruction',
        'digital_reconstruction',
        'placeholder',
        'computational_model',
      ]),
      filterOptionLabeler(GENERATION_TYPE)
    );
    expect(summary).toBe('Modified reconstruction, Digital reconstruction, Placeholder +1 more');
  });

  it('falls back to the raw value when no label can be resolved', () => {
    const labelOf = filterOptionLabeler(GENERATION_TYPE);
    expect(labelOf?.('retired_option')).toBeUndefined();
    expect(summarizeFilter(textEntry('retired_option'), labelOf)).toBe('retired_option');
    expect(summarizeFilter(setEntry(['placeholder', 'retired_option']), labelOf)).toBe(
      'Placeholder, retired_option'
    );
  });
});

describe('filterOptionLabeler — facet options', () => {
  it('resolves by bucket label (what a facet filter stores) and by bucket id', () => {
    const labelOf = filterOptionLabeler(MTYPE, facets);
    expect(labelOf?.('L5_TPC:A')).toBe('L5_TPC:A');
    expect(labelOf?.('uuid-2')).toBe('L23_MC');
  });

  it('summarizes facet selections as the bucket labels', () => {
    expect(
      summarizeFilter(setEntry(['L5_TPC:A', 'uuid-2']), filterOptionLabeler(MTYPE, facets))
    ).toBe('L5_TPC:A, L23_MC');
  });

  it('reads the bucket list under facetKey, not the filtered field', () => {
    expect(filterOptionLabeler(MTYPE, { mtype__pref_label: facets.mtype })).toBeUndefined();
  });

  it('has no labeler at all before the facets arrive, so the count summary stands', () => {
    expect(filterOptionLabeler(MTYPE, undefined)).toBeUndefined();
    expect(summarizeFilter(setEntry(['a', 'b']), filterOptionLabeler(MTYPE, undefined))).toBe(
      '2 selected'
    );
  });
});

describe('filterOptionLabeler — targets with nothing to resolve', () => {
  it('is undefined for a free-entry id target (pasted UUIDs have no labels)', () => {
    expect(filterOptionLabeler(PROTOCOL_IDS)).toBeUndefined();
    expect(summarizeFilter(setEntry(['a', 'b', 'c']))).toBe('3 selected');
  });

  it('is undefined for an async option source (a summary must not fetch)', () => {
    const target: IFilterTarget = {
      ...PROTOCOL_IDS,
      options: { kind: FilterOptionsKind.Async, load: () => Promise.resolve([]) },
    };
    expect(filterOptionLabeler(target)).toBeUndefined();
  });

  it('is undefined for a missing target', () => {
    expect(filterOptionLabeler(undefined, facets)).toBeUndefined();
  });
});

describe('filterTargetForEntry / summarizeFilterEntry', () => {
  const advancedFilters: ReadonlyArray<IAdvancedFilterGroup> = [
    { id: 'protocol', label: 'Protocol', filters: [GENERATION_TYPE, PROTOCOL_IDS] },
  ];

  const schema: IGridSchema<Row> = {
    id: 'cell-morphology',
    getRowId: (r) => r.id,
    advancedFilters,
    columns: [
      {
        id: 'mtype',
        header: 'M-type',
        filter: { operators: [OperatorId.In], targets: [MTYPE] },
      },
      {
        id: 'name',
        header: 'Name',
        filter: {
          operators: [OperatorId.Ilike],
          targets: [
            { id: 'text', label: 'Name', field: 'name', operators: [OperatorId.Ilike] },
            {
              id: 'kind',
              label: 'Kind',
              field: 'kind',
              operators: [OperatorId.Eq],
              options: {
                kind: FilterOptionsKind.Static,
                items: [{ id: 'k1', label: 'Kind one' }],
              },
            },
          ],
        },
      },
      {
        id: 'ids',
        header: 'IDs',
        filter: {
          operators: [OperatorId.In],
          targets: [{ ...PROTOCOL_IDS, id: 'ids', freeEntry: FreeEntryKind.Uuid }],
        },
      },
    ],
  };

  it('finds an advanced filter def from its adv: state key', () => {
    const key = advancedFilterKey('protocol', 'generationType');
    const entry = { ...textEntry('modified_reconstruction', 'generationType'), columnId: key };
    expect(filterTargetForEntry(schema, entry)?.id).toBe('generationType');
    expect(summarizeFilterEntry(entry, schema)).toBe('Modified reconstruction');
  });

  it('finds a column filter target by the entry targetId', () => {
    const entry = { ...textEntry('k1', 'kind'), columnId: 'name' };
    expect(summarizeFilterEntry(entry, schema)).toBe('Kind one');
  });

  it('falls back to the column first target when targetId is absent (legacy entries)', () => {
    const entry = { ...setEntry(['L5_TPC:A']), columnId: 'mtype' };
    expect(filterTargetForEntry(schema, entry)?.id).toBe('mtype');
    expect(summarizeFilterEntry(entry, schema, facets)).toBe('L5_TPC:A');
  });

  it('leaves an unknown state key with the plain summary', () => {
    const entry = { ...setEntry(['a', 'b']), columnId: 'nope' };
    expect(filterTargetForEntry(schema, entry)).toBeUndefined();
    expect(summarizeFilterEntry(entry, schema, facets)).toBe('2 selected');
  });

  it('keeps the count summary for a free-entry id column', () => {
    const entry = { ...setEntry(['a', 'b']), columnId: 'ids' };
    expect(summarizeFilterEntry(entry, schema, facets)).toBe('2 selected');
  });
});
