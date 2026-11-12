import { describe, expect, it } from 'vitest';

import { MAX_ID_SET_CELLS, neuronSetBlock } from '@/features/circuit-nodes/neuron-set-block';

import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';

// Six cells: two L5_TPC in layer 5, one L5_MC in layer 5, three L6_BPC in layer 6.
const MTYPE = { library: ['L5_TPC', 'L5_MC', 'L6_BPC'], indices: Uint32Array.of(0, 0, 1, 2, 2, 2) };
const LAYER = { library: ['5', '6'], indices: Uint32Array.of(0, 0, 0, 1, 1, 1) };
const ETYPE = { library: ['cADpyr', 'cNAC'], indices: Uint32Array.of(0, 0, 1, 0, 0, 0) };
// A property with too many values for obi-one to list, as the fly circuits' cell types are.
const CELL_TYPE = {
  library: ['EPG', 'PEN', 'PFN', 'hDelta', ''],
  indices: Uint32Array.of(0, 0, 1, 2, 3, 4),
};
const COLUMNS: ColumnMeta[] = [
  { name: 'layer', kind: 'categorical' },
  { name: 'mtype', kind: 'categorical' },
  { name: 'etype', kind: 'categorical' },
  { name: 'cell_type', kind: 'categorical' },
  { name: 'x', kind: 'numeric' },
];
// As obi-one lists them: not a property with too many values.
const OFFERED = { mtype: MTYPE.library, layer: LAYER.library, etype: ETYPE.library };
const getColumn = async (name: string): Promise<ColumnValues> => {
  const values = { mtype: MTYPE, layer: LAYER, etype: ETYPE, cell_type: CELL_TYPE }[name];
  if (!values) throw new Error(`No column ${name}`);
  return { kind: 'categorical', ...values };
};
const population = { name: 'S1', type: 'biophysical', file: 'nodes.h5' };
const build = (cells: number[], ticked: boolean, filterModel = {}, offered: object = OFFERED) =>
  neuronSetBlock({
    population,
    cells: Uint32Array.from(cells),
    rowCount: 6,
    ticked,
    filterModel,
    columns: COLUMNS,
    offered: offered as Record<string, string[]>,
    getColumn,
  });

describe('neuronSetBlock', () => {
  it('takes a filter of value lists as the property set', async () => {
    const { block, by } = await build([0, 1, 2], false, {
      layer: { filterType: 'set', values: ['5'] },
    });
    expect(by).toBe('property');
    expect(block).toMatchObject({
      type: 'BiophysicalPopulationPropertyNeuronSet',
      population: 'S1',
      property_filter: { type: 'NeuronPropertyFilter', filter_dict: { layer: ['5'] } },
    });
  });

  it('says ticked cells by the fewest values that pick out exactly them', async () => {
    // The two L5_TPC: also all the layer 5 cADpyr ones, but mtype alone says it.
    const { block, by } = await build([0, 1], true);
    expect(by).toBe('property');
    expect(block).toMatchObject({ property_filter: { filter_dict: { mtype: ['L5_TPC'] } } });
  });

  it('takes the ids of cells their values cannot pick out', async () => {
    // One of the three L6_BPC: nothing tells it from the other two.
    const { block, by } = await build([3], true);
    expect(by).toBe('id');
    expect(block).toMatchObject({
      type: 'BiophysicalPopulationIDNeuronSet',
      neuron_ids: { type: 'NamedTuple', elements: [3] },
    });
  });

  it('reads a filter it cannot copy, a numeric one, by the cells it keeps', async () => {
    const { block, by } = await build([3, 4, 5], false, {
      x: { filterType: 'number', type: 'greaterThan', filter: '10' },
    });
    expect(by).toBe('property');
    expect(block).toMatchObject({ property_filter: { filter_dict: { mtype: ['L6_BPC'] } } });
  });

  it('names point populations', async () => {
    const { block } = await neuronSetBlock({
      population: { name: 'drosophila', type: 'brian2_point', file: 'n.h5' },
      cells: Uint32Array.of(0),
      rowCount: 6,
      ticked: true,
      filterModel: {},
      columns: COLUMNS,
      offered: OFFERED,
      getColumn,
    });
    expect(block?.type).toBe('PointPopulationIDNeuronSet');
  });

  describe('with a property the form does not offer', () => {
    const FILTER = { cell_type: { filterType: 'set', values: ['EPG'] } };
    // Offers layer alone, whose values do not pick out these two cells.
    const VAGUE = { layer: LAYER.library };

    it('takes the ids of the cells a filter on it leaves', async () => {
      const { block, by } = await build([0, 1], false, FILTER, VAGUE);
      expect(by).toBe('id');
      expect(block).toMatchObject({
        type: 'BiophysicalPopulationIDNeuronSet',
        neuron_ids: { elements: [0, 1] },
      });
    });

    it('says them by a property on offer where that picks out exactly them', async () => {
      const { block, by } = await build([0, 1], false, FILTER);
      expect(by).toBe('property');
      expect(block).toMatchObject({ property_filter: { filter_dict: { mtype: ['L5_TPC'] } } });
    });

    it('takes the ids where the circuit offers no property at all', async () => {
      const { by } = await build([0, 1], false, { layer: FILTER.cell_type }, {});
      expect(by).toBe('id');
    });
  });

  it('takes the ids where the form offers the property but not the value', async () => {
    const { by } = await build(
      [0, 1],
      false,
      { mtype: { filterType: 'set', values: ['L5_TPC'] } },
      { mtype: ['L5_MC', 'L6_BPC'] }
    );
    expect(by).toBe('id');
  });

  it('takes the ids of cells a blank value picks out, which the form cannot show', async () => {
    const { by } = await build([5], true, {}, { cell_type: CELL_TYPE.library });
    expect(by).toBe('id');
  });

  describe('around the most ids a set may hold', () => {
    const upTo = (count: number) => Array.from({ length: count }, (_, cell) => cell);

    it('takes the ids of as many cells as it may hold', async () => {
      const { block, by } = await build(upTo(MAX_ID_SET_CELLS), true, {}, {});
      expect(by).toBe('id');
      expect(block).toMatchObject({ neuron_ids: { name: `${MAX_ID_SET_CELLS}_selected_neurons` } });
    });

    it('makes no set of more cells than that', async () => {
      const { block, by } = await build(upTo(MAX_ID_SET_CELLS + 1), true, {}, {});
      expect(by).toBeNull();
      expect(block).toBeNull();
    });

    it('still takes a filter of value lists as the property set', async () => {
      const { by } = await build(upTo(MAX_ID_SET_CELLS + 1), false, {
        layer: { filterType: 'set', values: ['5'] },
      });
      expect(by).toBe('property');
    });

    it('still says that many cells by values that pick out exactly them', async () => {
      const many = MAX_ID_SET_CELLS + 1;
      const { block, by } = await neuronSetBlock({
        population,
        cells: Uint32Array.from(upTo(many)),
        rowCount: many * 2,
        ticked: false,
        filterModel: { x: { filterType: 'number', type: 'greaterThan', filter: '10' } },
        columns: COLUMNS,
        offered: { mtype: ['A', 'B'] },
        getColumn: async () => ({
          kind: 'categorical',
          library: ['A', 'B'],
          indices: Uint32Array.from({ length: many * 2 }, (_, row) => (row < many ? 0 : 1)),
        }),
      });
      expect(by).toBe('property');
      expect(block).toMatchObject({ property_filter: { filter_dict: { mtype: ['A'] } } });
    });
  });
});
