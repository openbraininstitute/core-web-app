import { expect, test } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { coreTypeOf } from '@/features/logbook/api/entities';
import { has3dView } from '@/features/logbook/editor/blocks/viewers-3d';

test('reconstructed and synthesized morphologies both offer the 3D view', () => {
  expect(has3dView('morphology')).toBe(true);
  expect(has3dView('synthesized_cell_morphology')).toBe(true);
  expect(has3dView('emodel')).toBe(false);
});

test.each([
  ExtendedEntitiesTypeDict.EMCellMesh,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.MemodelCircuit,
  ExtendedEntitiesTypeDict.UniversalCellMorphology,
])('a %s card offers the 3D view, as on the workflows page', (type) => {
  expect(has3dView(type)).toBe(true);
});

test.each([
  'circuit',
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  ExtendedEntitiesTypeDict.SmallMicrocircuit,
  ExtendedEntitiesTypeDict.Microcircuit,
  ExtendedEntitiesTypeDict.WholeBrain,
])('a %s card is a circuit underneath, so it offers the 3D view', (type) => {
  expect(has3dView(type)).toBe(true);
});

test('a brain region card stays a brain region, not the region circuit of the same name', () => {
  expect(coreTypeOf('brain_region')).toBeNull();
  expect(has3dView('brain_region')).toBe(false);
});

test('a recording array card offers its electrodes in 3D only with the electrode overlays flag', () => {
  const type = ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray;
  expect(has3dView(type)).toBe(false);
  expect(has3dView(type, { 'electrode-overlays': false })).toBe(false);
  expect(has3dView(type, { 'electrode-overlays': true })).toBe(true);
});

test('a simulation card is read from its own route, so it has no core details panel', () => {
  expect(coreTypeOf('simulation')).toBeNull();
});
