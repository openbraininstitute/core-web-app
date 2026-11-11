import { describe, expect, it } from 'vitest';

import { buildColDefs } from '@/features/data-grid/renderers/aggrid/col-def-mapper';

import type { IFilterTarget, IResolvedColumn } from '@/features/data-grid/core';

interface Row {
  id: string;
}

const NAME_TARGET: IFilterTarget = {
  id: 'name',
  label: 'Name',
  field: 'subject__species__name',
  operators: ['in'],
  options: { kind: 'facets' },
};
const ID_TARGET: IFilterTarget = {
  id: 'id',
  label: 'ID',
  field: 'subject__species__id',
  operators: ['in'],
};

const OPTIONS = { hidden: new Set<string>(), columnWidths: {} };

function speciesColumn(over: Partial<IResolvedColumn<Row>> = {}): IResolvedColumn<Row> {
  return {
    id: 'species',
    header: 'Species',
    filterAvailable: true,
    hiddenByDefaultResolved: false,
    filter: { operators: ['in'], field: 'subject__species__name' },
    filterTargets: [NAME_TARGET, ID_TARGET],
    ...over,
  };
}

function headerFilter(def: { headerComponentParams?: unknown }) {
  return (def.headerComponentParams as { filter?: { targets: IFilterTarget[] } } | undefined)
    ?.filter;
}

describe('buildColDefs — filter targets', () => {
  it('offers every target a column declares — no opt-in needed', () => {
    const declared = [NAME_TARGET, ID_TARGET];
    const [def] = buildColDefs([speciesColumn({ filterTargets: declared })], OPTIONS);
    // there is no per-target gate: every declared target reaches the header verbatim
    expect(headerFilter(def)?.targets).toEqual(declared);
  });

  it('BACK-COMPAT: a legacy flat filter yields exactly one synthesised target', () => {
    const [def] = buildColDefs(
      [
        {
          id: 'mtype',
          header: 'M-type',
          filterAvailable: true,
          hiddenByDefaultResolved: false,
          filter: { operators: ['in'], field: 'mtype__pref_label', facetKey: 'mtype' },
        },
      ],
      OPTIONS
    );
    expect(headerFilter(def)?.targets).toEqual([
      {
        id: 'default',
        label: 'M-type',
        field: 'mtype__pref_label',
        operators: ['in'],
        options: undefined,
        facetKey: 'mtype',
        description: undefined,
      },
    ]);
  });

  it('renders no filter affordance when the column has no filter or is unavailable', () => {
    const [none] = buildColDefs(
      [{ id: 'x', header: 'X', filterAvailable: false, hiddenByDefaultResolved: false }],
      OPTIONS
    );
    expect(headerFilter(none)).toBeUndefined();
    expect(none.suppressHeaderMenuButton).toBeUndefined();

    const [unavailable] = buildColDefs([speciesColumn({ filterAvailable: false })], OPTIONS);
    expect(headerFilter(unavailable)).toBeUndefined();
  });
});
