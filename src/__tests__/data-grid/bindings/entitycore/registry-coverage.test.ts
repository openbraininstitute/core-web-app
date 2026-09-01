import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityGridDefinition } from '@/features/data-grid/bindings/entitycore/registry';
import { DATA_BROWSE_ALLOWED_ENTITIES } from '@/features/views/listing/data-browse-entities';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

/**
 * Migration guardrail: there is no legacy fallback any more, so an unregistered
 * dataType renders an error instead of a listing and every routable type needs a
 * definition.
 *
 * Coverage is NOT complete, and cannot be. The data-browse list below is imported from
 * the route itself, so it cannot drift. The picker list is still hand-kept and is only
 * a lower bound: `browse-widget.tsx` resolves its accepted types at runtime from the
 * server-supplied scan-config schema (`acceptedEntityTypesFromField`), which takes
 * precedence over the static `configurationInputs`. No static list can mirror that, so
 * treat a green run as "these are registered", not "everything reachable is registered".
 */

/**
 * The REAL route allowlist, not a copy: a hand-kept copy drifted once
 * (`EFeatureExtractionResult` was routable but unregistered, so the page rendered
 * empty), which is exactly the failure this test exists to prevent.
 */
const DATA_BROWSE_ENTITIES: ReadonlyArray<TExtendedEntitiesTypeDict> = DATA_BROWSE_ALLOWED_ENTITIES;

/** The notebooks browse route (`notebooks/(browse)/browse/[type]`) — group members. */
const NOTEBOOK_BROWSE_ENTITIES: ReadonlyArray<TExtendedEntitiesTypeDict> = [
  ExtendedEntitiesTypeDict.AnalysisNotebookTemplate,
  ExtendedEntitiesTypeDict.AnalysisNotebookResult,
];

/**
 * Every type reachable through the workflow `/new` picker (union of the workflow
 * descriptors' `configurationInputs[].type` / `sourceType`), plus the build-page and
 * detail-view pickers.
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
