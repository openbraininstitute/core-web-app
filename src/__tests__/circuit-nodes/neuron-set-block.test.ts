import { describe, expect, it } from 'vitest';

import { neuronSetBlock } from '@/features/circuit-nodes/neuron-set-block';

import type { ColumnMeta, ColumnValues } from '@/features/circuit-nodes/types';

// Six cells: two L5_TPC in layer 5, one L5_MC in layer 5, three L6_BPC in layer 6.
const MTYPE = { library: ['L5_TPC', 'L5_MC', 'L6_BPC'], indices: Uint32Array.of(0, 0, 1, 2, 2, 2) };
const LAYER = { library: ['5', '6'], indices: Uint32Array.of(0, 0, 0, 1, 1, 1) };
const ETYPE = { library: ['cADpyr', 'cNAC'], indices: Uint32Array.of(0, 0, 1, 0, 0, 0) };
const COLUMNS: ColumnMeta[] = [
  { name: 'layer', kind: 'categorical' },
  { name: 'mtype', kind: 'categorical' },
  { name: 'etype', kind: 'categorical' },
  { name: 'x', kind: 'numeric' },
];
const getColumn = async (name: string): Promise<ColumnValues> => {
  const values = { mtype: MTYPE, layer: LAYER, etype: ETYPE }[name];
  if (!values) throw new Error(`No column ${name}`);
  return { kind: 'categorical', ...values };
};
const population = { name: 'S1', type: 'biophysical', file: 'nodes.h5' };
const build = (cells: number[], ticked: boolean, filterModel = {}) =>
  neuronSetBlock({
    population,
    cells: Uint32Array.from(cells),
    rowCount: 6,
    ticked,
    filterModel,
    columns: COLUMNS,
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
      getColumn,
    });
    expect(block.type).toBe('PointPopulationIDNeuronSet');
  });
});
