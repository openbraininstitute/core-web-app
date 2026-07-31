import {
  CircuitBuildCategoryDictionary,
  CircuitScaleDictionary,
} from '@/api/entitycore/types/entities/circuit';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';

/**
 * a "regular" circuit, e.g. a computational-model microcircuit build — has its own generic
 * details page at `circuit/{id}`
 */
export function makeCircuit(overrides: Partial<ICircuit> = {}): ICircuit {
  return {
    id: 'circuit-1',
    name: 'Test circuit',
    type: EntityTypeDict.Circuit,
    scale: CircuitScaleDictionary.Microcircuit,
    build_category: CircuitBuildCategoryDictionary.ComputationalModel,
    number_neurons: 10,
    number_connections: 100,
    root_circuit_id: 'circuit-1',
    experiment_date: null,
    ...overrides,
  } as unknown as ICircuit;
}

/**
 * a circuit built at single-neuron scale from an EM dense reconstruction (the "em-circuit"
 * build) — its details page is `single-neuron-circuit/{id}` ("Synaptome"),
 * not the generic `circuit/{id}` page
 */
export function makeSingleNeuronScaleCircuit(overrides: Partial<ICircuit> = {}): ICircuit {
  return makeCircuit({
    id: 'circuit-single-1',
    name: 'Test em-circuit synaptome',
    scale: CircuitScaleDictionary.Single,
    build_category: CircuitBuildCategoryDictionary.EmReconstruction,
    ...overrides,
  });
}

export function makeMemodel(overrides: Partial<EntityCoreObjectTypes> = {}): EntityCoreObjectTypes {
  return {
    id: 'memodel-1',
    name: 'Test ME-model',
    type: EntityTypeDict.Memodel,
    ...overrides,
  } as unknown as EntityCoreObjectTypes;
}

export function makeCellMorphology(
  overrides: Partial<EntityCoreObjectTypes> = {}
): EntityCoreObjectTypes {
  return {
    id: 'cell-morphology-1',
    name: 'Test cell morphology',
    type: EntityTypeDict.CellMorphology,
    ...overrides,
  } as unknown as EntityCoreObjectTypes;
}

/** an entity type whose domain config declares no `detailViewSections` (no details page yet) */
export function makeExtracellularRecordingArray(
  overrides: Partial<EntityCoreObjectTypes> = {}
): EntityCoreObjectTypes {
  return {
    id: 'ext-recording-array-1',
    name: 'Test extracellular recording array',
    type: ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
    ...overrides,
  } as unknown as EntityCoreObjectTypes;
}
