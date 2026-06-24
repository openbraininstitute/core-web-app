import { snakeCase } from 'es-toolkit/compat';
import { describe, expect, it } from 'vitest';

import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { resolveConcreteEntityPathParam } from '@/utils/url-builder';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';

describe('resolveConcreteEntityPathParam', () => {
  describe('cell morphology', () => {
    it('narrows the picker-only universal aggregator to the concrete cell-morphology listing', () => {
      // `universal_cell_morphology` has no listing/route of its own; it must resolve to the
      // concrete type so the detail view URL + close/breadcrumb don't 404.
      expect(resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.UniversalCellMorphology)).toBe(
        'cell-morphology'
      );
      expect(
        resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.UniversalCellMorphology)
      ).not.toBe('universal-cell-morphology');
    });

    it('kebab-cases the concrete cell-morphology type unchanged', () => {
      expect(resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.CellMorphology)).toBe(
        'cell-morphology'
      );
    });

    it('maps the universal and concrete morphology types to the same path param', () => {
      expect(resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.UniversalCellMorphology)).toBe(
        resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.CellMorphology)
      );
    });
  });

  describe('circuits — scale variants fold into the generic `circuit` data page', () => {
    it.each<[TExtendedEntitiesTypeDict, string]>([
      [ExtendedEntitiesTypeDict.Circuit, 'circuit'],
      [ExtendedEntitiesTypeDict.SmallMicrocircuit, 'circuit'],
      [ExtendedEntitiesTypeDict.Microcircuit, 'circuit'],
      [ExtendedEntitiesTypeDict.PairedNeuronCircuit, 'circuit'],
      [ExtendedEntitiesTypeDict.WholeBrain, 'circuit'],
      [ExtendedEntitiesTypeDict.BrainRegion, 'circuit'],
    ])('routes %s to the circuit page → %s', (extendedType, expected) => {
      expect(resolveConcreteEntityPathParam(extendedType)).toBe(expected);
    });

    it('keeps single_neuron_circuit on its own page (own listing + view definition)', () => {
      expect(resolveConcreteEntityPathParam(ExtendedEntitiesTypeDict.SingleNeuronCircuit)).toBe(
        'single-neuron-circuit'
      );
    });
  });

  describe('other entities map to themselves (kebab-cased)', () => {
    it.each<[TExtendedEntitiesTypeDict, string]>([
      [ExtendedEntitiesTypeDict.Emodel, 'emodel'],
      [ExtendedEntitiesTypeDict.Memodel, 'memodel'],
      [ExtendedEntitiesTypeDict.ElectricalCellRecording, 'electrical-cell-recording'],
      [ExtendedEntitiesTypeDict.IonChannelRecording, 'ion-channel-recording'],
      [ExtendedEntitiesTypeDict.IonChannelModel, 'ion-channel-model'],
      [ExtendedEntitiesTypeDict.SingleNeuronSynaptome, 'single-neuron-synaptome'],
      [ExtendedEntitiesTypeDict.ExperimentalNeuronDensity, 'experimental-neuron-density'],
      [ExtendedEntitiesTypeDict.ExperimentalBoutonDensity, 'experimental-bouton-density'],
      [
        ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
        'experimental-synapses-per-connection',
      ],
      [ExtendedEntitiesTypeDict.EMCellMesh, 'em-cell-mesh'],
    ])('maps %s → %s', (extendedType, expected) => {
      expect(resolveConcreteEntityPathParam(extendedType)).toBe(expected);
    });
  });

  it('returns an empty string when the type is missing', () => {
    expect(resolveConcreteEntityPathParam(undefined)).toBe('');
  });

  describe('round-trips to a resolvable entity config (mirrors how the routes parse [type])', () => {
    // the data view/browse routes call `snakeCase()` on the [type] path param and then look the
    // entity up via `getEntityByExtendedType`. So the path param this helper produces must snake
    // back to a real, resolvable extended type — that round-trip is exactly what stops the 404.
    it.each<[TExtendedEntitiesTypeDict, TExtendedEntitiesTypeDict]>([
      [ExtendedEntitiesTypeDict.UniversalCellMorphology, ExtendedEntitiesTypeDict.CellMorphology],
      [ExtendedEntitiesTypeDict.CellMorphology, ExtendedEntitiesTypeDict.CellMorphology],
      [ExtendedEntitiesTypeDict.Circuit, ExtendedEntitiesTypeDict.Circuit],
      [ExtendedEntitiesTypeDict.SmallMicrocircuit, ExtendedEntitiesTypeDict.Circuit],
      [ExtendedEntitiesTypeDict.Microcircuit, ExtendedEntitiesTypeDict.Circuit],
      [ExtendedEntitiesTypeDict.PairedNeuronCircuit, ExtendedEntitiesTypeDict.Circuit],
      [ExtendedEntitiesTypeDict.SingleNeuronCircuit, ExtendedEntitiesTypeDict.SingleNeuronCircuit],
      [ExtendedEntitiesTypeDict.Emodel, ExtendedEntitiesTypeDict.Emodel],
      [ExtendedEntitiesTypeDict.Memodel, ExtendedEntitiesTypeDict.Memodel],
      [
        ExtendedEntitiesTypeDict.ElectricalCellRecording,
        ExtendedEntitiesTypeDict.ElectricalCellRecording,
      ],
    ])('%s → path param snakes back to %s and resolves to a config', (input, expectedResolved) => {
      const resolvedType = snakeCase(
        resolveConcreteEntityPathParam(input)
      ) as TExtendedEntitiesTypeDict;

      expect(resolvedType).toBe(expectedResolved);
      expect(getEntityByExtendedType({ type: resolvedType })).toBeDefined();
    });
  });
});
