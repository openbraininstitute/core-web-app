import pProps from 'p-props';

import { SingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ReconstructionMorphology } from '@/entity-configuration/domain/experimental/reconstruction-morphology';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { getElectricalCellRecordings } from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { SynapsePerConnection } from '@/entity-configuration/domain/experimental/synapse-per-connection';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { getEntitiesCount } from '@/api/entitycore/queries/general/entity';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { env } from '@/env';

import type { WorkspaceContext } from '@/types/common';

// import { Circuit } from '@/entity-configuration/domain/model/circuit';

export const ExperimentalEntitiesTileTypes = {
  ReconstructionMorphology,
  ElectricalCellRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsePerConnection,
} as const;

export const ModelEntitiesTileTypes = {
  Emodel,
  MEmodel,
  SingleNeuronSynaptome,
} as const;

export const SimulationEntitiesTileTypes = {
  SingleNeuronSimulation,
  SingleNeuronSynaptomeSimulation,
  PairedNeuronCircuitSimulation,
  SmallMicrocircuitSimulation,
} as const;

export function getEntityTypeFromUrlOnEntityScope(url: string) {
  const match = url.match(/\/browse\/entity\/([^/?]+)/);
  return match ? match[1] : null;
}

export function getAllEntitiesCount({
  virtualLabId,
  projectId,
  brainRegionId,
}: WorkspaceContext & { brainRegionId: string }) {
  return getEntitiesCount({
    context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
    types: [
      'experimental_synapses_per_connection',
      'experimental_neuron_density',
      'experimental_bouton_density',
      'reconstruction_morphology',
      'single_neuron_synaptome',
      'memodel',
      'emodel',
    ],
    brainRegion: {
      within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_ascendants: false,
    },
  });
}

export async function getSimulationsCount({
  virtualLabId,
  projectId,
  brainRegionId,
  personId,
}: WorkspaceContext & { brainRegionId: string; personId: string | undefined }) {
  const promises = Object.fromEntries(
    Object.entries(SimulationEntitiesTileTypes).map(([, value]) => {
      return [
        value.extendedType,
        value.api.query?.list?.({
          withFacets: false,
          context: {
            virtualLabId,
            projectId,
          },
          filters: {
            page: 1,
            page_size: 1,
            ...([
              SimulationEntitiesTileTypes.SingleNeuronSimulation.extendedType,
              SimulationEntitiesTileTypes.SingleNeuronSynaptomeSimulation.extendedType,
            ].includes(value.extendedType)
              ? {
                  within_brain_region_hierarchy_id:
                    env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
                  within_brain_region_brain_region_id: brainRegionId ?? null,
                  within_brain_region_ascendants: false,
                }
              : {}),
            created_by__id: personId,
          },
        }),
      ];
    })
  );
  const result = await pProps(promises);

  return Object.fromEntries(
    Object.entries(result).map(([key, value]) => [key, value?.pagination.total_items ?? 0])
  );
}

export function getElectricalCellRecordingsCount({
  virtualLabId,
  projectId,
  brainRegionId,
}: WorkspaceContext & { brainRegionId: string }) {
  return getElectricalCellRecordings({
    withFacets: false,
    context: virtualLabId && projectId ? { virtualLabId, projectId } : undefined,
    filters: {
      recording_origin: ElectricalRecordingOriginDictionary.InVitro,
      page: 1,
      page_size: 1,
      within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_ascendants: false,
    },
  });
}
