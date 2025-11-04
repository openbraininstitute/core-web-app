/* eslint-disable no-nested-ternary */

import pProps from 'p-props';

import { MEModelCircuitSimulation } from '@/entity-configuration/domain/simulation/memodel-circuit-simulation';
import { SingleNeuronSynaptomeSimulation } from '@/entity-configuration/domain/simulation/single-neuron-synaptome-simulation';
import { SmallMicrocircuitSimulation } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { PairedNeuronCircuitSimulation } from '@/entity-configuration/domain/simulation/paired-neurons-simulation';
import { ElectricalRecordingOriginDictionary } from '@/api/entitycore/types/entities/electrical-cell-recording';
import { ElectricalCellRecording } from '@/entity-configuration/domain/experimental/electrical-cell-recording';
import { getElectricalCellRecordings } from '@/api/entitycore/queries/experimental/electrical-cell-recording';
import { SingleNeuronSimulation } from '@/entity-configuration/domain/simulation/single-neuron-simulation';
import { SynapsePerConnection } from '@/entity-configuration/domain/experimental/synapse-per-connection';
import { MEModelWithSynapsesCircuit } from '@/entity-configuration/domain/model/me-model-with-synapses';
import { IonChannelRecording } from '@/entity-configuration/domain/experimental/ion-channel-recording';
import { SingleNeuronSynaptome } from '@/entity-configuration/domain/model/single-neuron-synaptome';
import { CellMorphology } from '@/entity-configuration/domain/experimental/cell-morphology';
import { NeuronDensity } from '@/entity-configuration/domain/experimental/neuron-density';
import { BoutonDensity } from '@/entity-configuration/domain/experimental/bouton-density';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { getEntitiesCount } from '@/api/entitycore/queries/general/entity';
import { MEmodel } from '@/entity-configuration/domain/model/me-model';
import { Circuit } from '@/entity-configuration/domain/model/circuit';
import { IonChannelModel } from '@/entity-configuration/domain/model/ion-channel-model';

import { Emodel } from '@/entity-configuration/domain/model/e-model';
import { WorkspaceScope } from '@/constants';
import { env } from '@/env';

import type { WorkspaceContext } from '@/types/common';
import type { TWorkspaceScope } from '@/constants';

export const ExperimentalEntitiesTileTypes = {
  ReconstructionMorphology: CellMorphology,
  ElectricalCellRecording,
  IonChannelRecording,
  NeuronDensity,
  BoutonDensity,
  SynapsePerConnection,
} as const;

export const ModelEntitiesTileTypes = {
  SingleNeuronSynaptome,
  Emodel,
  MEmodel,
  Circuit,
  MEModelWithSynapsesCircuit,
  IonChannelModel,
} as const;

export const SimulationEntitiesTileTypes = {
  SingleNeuronSimulation,
  MEModelCircuitSimulation,
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
      ExtendedEntitiesTypeDict.ExperimentalSynapsesPerConnection,
      ExtendedEntitiesTypeDict.ExperimentalNeuronDensity,
      ExtendedEntitiesTypeDict.ExperimentalBoutonDensity,
      ExtendedEntitiesTypeDict.CellMorphology,
      ExtendedEntitiesTypeDict.SingleNeuronSynaptome,
      ExtendedEntitiesTypeDict.Memodel,
      ExtendedEntitiesTypeDict.Emodel,
      ExtendedEntitiesTypeDict.Circuit,
    ],
    brainRegion: {
      within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
      within_brain_region_brain_region_id: brainRegionId ?? null,
      within_brain_region_ascendants: false,
    },
  });
}

export async function getAllEntitiesCountScoped({
  virtualLabId,
  projectId,
  brainRegionId,
  scope,
}: WorkspaceContext & {
  brainRegionId: string;
  scope: TWorkspaceScope;
}) {
  const items = { ...ExperimentalEntitiesTileTypes, ...ModelEntitiesTileTypes };
  const promises = Object.fromEntries(
    Object.entries(items).map(([, value]) => {
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
            within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
            within_brain_region_brain_region_id: brainRegionId ?? null,
            within_brain_region_ascendants: false,
            ...(scope === WorkspaceScope.Project
              ? {
                  authorized_project_id: projectId,
                  authorized_public: false,
                }
              : scope === WorkspaceScope.Public
                ? {
                    authorized_public: true,
                  }
                : {}),
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

export async function getSimulationsCount({
  virtualLabId,
  projectId,
  brainRegionId,
  scope,
}: WorkspaceContext & {
  brainRegionId: string;
  scope: TWorkspaceScope;
}) {
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
            within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
            within_brain_region_brain_region_id: brainRegionId ?? null,
            within_brain_region_ascendants: false,
            ...(scope === WorkspaceScope.Project
              ? {
                  authorized_project_id: projectId,
                  authorized_public: false,
                }
              : scope === WorkspaceScope.Public
                ? {
                    authorized_public: true,
                  }
                : {}),
          },
          circuitFilter: {
            within_brain_region_hierarchy_id: env.NEXT_PUBLIC_DEFAULT_BRAIN_REGION_HIERARCHY_ID,
            within_brain_region_brain_region_id: brainRegionId ?? null,
            within_brain_region_ascendants: false,
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
  scope,
}: WorkspaceContext & {
  brainRegionId: string;
  scope: TWorkspaceScope;
}) {
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
      ...(scope === WorkspaceScope.Project
        ? {
            authorized_project_id: projectId,
            authorized_public: false,
          }
        : scope === WorkspaceScope.Public
          ? {
              authorized_public: true,
            }
          : {}),
    },
  });
}
