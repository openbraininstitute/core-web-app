import { atom } from 'jotai';
import isEqual from 'lodash/isEqual';

import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { readAtomFamilyWithExpiration } from '@/util/atoms';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { EntityTypeValue } from '@/api/entitycore/types';
import {
  CircuitSimulationExecutionStatus,
  ICircuitSimulationExecution,
} from '@/api/entitycore/types/entities/circuit-simulation-execution';
import { WorkspaceContext } from '@/types/common';

export const simExecBySimIdAtomFamily = readAtomFamilyWithExpiration(
  ({ simulationId, context }: { simulationId: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuitSimulationExecution>>(async () => {
      const simulationExecutionFilters = { used__id: simulationId };
      const res = await getCircuitSimulationExecutions({
        filters: simulationExecutionFilters,
        context,
      });

      return res.data[0];
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const simExecStatusMapAtomFamily = readAtomFamilyWithExpiration(
  ({ simulationIds, context }: { simulationIds: string[]; context: WorkspaceContext }) =>
    atom<Promise<Map<string, CircuitSimulationExecutionStatus>>>(async () => {
      const simulationExecutionFilters = { used__id__in: simulationIds.join(',') };
      const res = await getCircuitSimulationExecutions({
        filters: simulationExecutionFilters,
        context,
      });

      return res.data.reduce(
        (map, simExec) => map.set(simExec.used[0].id, simExec.status),
        new Map()
      );
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const simResultBySimIdAtomFamily = readAtomFamilyWithExpiration(
  ({ simulationId, context }: { simulationId: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuitSimulationResult>>(async (get) => {
      const execution = await get(simExecBySimIdAtomFamily({ simulationId, context }));

      if (!execution?.generated?.[0]) {
        throw new Error('Simulation Result not found');
      }

      return getCircuitSimulationResult({ id: execution.generated[0].id, context });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const simulationsByCampaignIdAtomFamily = readAtomFamilyWithExpiration(
  ({ campaignId, context }: { campaignId: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuitSimulation[]>>(async () => {
      const filters = { simulation_campaign_id: campaignId };
      const res = await getCircuitSimulations({ filters, context });

      return res.data;
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const circuitAtomFamily = readAtomFamilyWithExpiration(
  ({ circuitId, context }: { circuitId: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuit>>(async () => {
      return getCircuit({ id: circuitId, context });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const fileAtomFamily = readAtomFamilyWithExpiration(
  ({
    id,
    entityId,
    entityType,
    assetPath,
    context,
  }: {
    id: string;
    entityId: string;
    entityType: EntityTypeValue;
    assetPath?: string;
    context: WorkspaceContext;
  }) =>
    atom<Promise<ICircuit>>(async () => {
      const res = await downloadAsset({
        ctx: context,
        entityId,
        id,
        entityType,
        assetPath,
        asRawResponse: true,
      });

      return res.json();
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);
