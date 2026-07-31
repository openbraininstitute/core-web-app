import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * MIGRATION GUARDRAIL (backlog T-07).
 *
 * Every dataType that can reach `BrowseEntityScope` must be registered, otherwise
 * that listing silently falls back to the legacy antd table (`BrowseEntityScopeLegacy`)
 * — a regression that is invisible in code review and easy to introduce by adding a
 * new entity type to a route or workflow without authoring its grid schema.
 *
 * The lists below MIRROR the real call sites. When you add an entity there, add it
 * here too; this test then forces the schema to exist before the listing can ship.
 */

/**
 * Mirrors `AllowedEntities` in
 * `src/app/app/virtual-lab/[virtualLabId]/[projectId]/data/(browse)/browse/entity/[type]/page.tsx`.
 * Anything absent from that list 404s, so this IS the data-browse surface.
 */
const DATA_BROWSE_ENTITIES: ReadonlyArray<TExtendedEntitiesTypeDict> = [
  ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
  ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
  ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
  ExtendedEntitiesTypeDict.CellMorphology,
  ExtendedEntitiesTypeDict.ElectricalCellRecording,
  ExtendedEntitiesTypeDict.IonChannelRecording,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.MemodelCircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptomeSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.PairedNeuronCircuitSimulation,
  ExtendedEntitiesTypeDict.SmallMicrocircuitSimulation,
  ExtendedEntitiesTypeDict.MicrocircuitSimulation,
  ExtendedEntitiesTypeDict.SingleNeuronSimulation,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.SynthesizedCellMorphology,
  ExtendedEntitiesTypeDict.SimulatableExtracellularRecordingArray,
  ExtendedEntitiesTypeDict.EMCellMesh,
  ExtendedEntitiesTypeDict.IonChannelModelSimulation,
  ExtendedEntitiesTypeDict.RegionCircuitSimulation,
  ExtendedEntitiesTypeDict.WholeBrainCircuitSimulation,
];

/** The notebooks browse route (`notebooks/(browse)/browse/[type]`) — group members. */
const NOTEBOOK_BROWSE_ENTITIES: ReadonlyArray<TExtendedEntitiesTypeDict> = [
  ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
  ExtendedEntitiesTypeDict.AnalysisNotebookResult,
];

/**
 * Union of every `configurationInputs[].type` / `sourceType` across the workflow
 * descriptors (`src/ui/segments/workflows/config/activities/*.ts`) — these reach
 * `BrowseEntityScope` through the workflow `/new` picker, plus the build-page and
 * detail-view pickers that name a type directly.
 */
const PICKER_ENTITIES: ReadonlyArray<TExtendedEntitiesTypeDict> = [
  ExtendedEntitiesTypeDict.EMCellMesh,
  ExtendedEntitiesTypeDict.Circuit,
  ExtendedEntitiesTypeDict.UniversalCellMorphology,
  ExtendedEntitiesTypeDict.Memodel,
  ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
  ExtendedEntitiesTypeDict.IonChannelModel,
  ExtendedEntitiesTypeDict.IonChannelRecording,
  ExtendedEntitiesTypeDict.Emodel,
  ExtendedEntitiesTypeDict.MemodelCircuit,
  ExtendedEntitiesTypeDict.SingleNeuronCircuit,
  ExtendedEntitiesTypeDict.PairedNeuronCircuit,
  ExtendedEntitiesTypeDict.SmallMicrocircuit,
  ExtendedEntitiesTypeDict.Microcircuit,
  ExtendedEntitiesTypeDict.BrainRegion,
  ExtendedEntitiesTypeDict.WholeBrain,
];

describe('entity grid registry coverage', () => {
  it.each(DATA_BROWSE_ENTITIES)('data browse listing %s is registered', (dataType) => {
    expect(getEntityGridDefinition(dataType)).toBeDefined();
  });

  it.each(NOTEBOOK_BROWSE_ENTITIES)('notebooks browse listing %s is registered', (dataType) => {
    expect(getEntityGridDefinition(dataType)).toBeDefined();
  });

  it.each(PICKER_ENTITIES)('workflow/detail picker %s is registered', (dataType) => {
    expect(getEntityGridDefinition(dataType)).toBeDefined();
  });

  it('registered definitions expose a schema whose id and row-id resolver are set', () => {
    const all = [...DATA_BROWSE_ENTITIES, ...NOTEBOOK_BROWSE_ENTITIES, ...PICKER_ENTITIES];
    for (const dataType of all) {
      const definition = getEntityGridDefinition(dataType);
      expect(definition?.schema.id, `${dataType} schema id`).toBeTruthy();
      expect(typeof definition?.schema.getRowId, `${dataType} getRowId`).toBe('function');
      expect(definition?.schema.columns.length, `${dataType} columns`).toBeGreaterThan(0);
    }
  });
});
