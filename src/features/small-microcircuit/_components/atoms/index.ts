import { atom } from 'jotai';
import { atomWithRefresh } from 'jotai/utils';
import isEqual from 'lodash/isEqual';

import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { TEntityTypeDict } from '@/api/entitycore/types';
import { ICircuit } from '@/api/entitycore/types/entities/circuit';
import { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import {
  CircuitSimulationExecutionStatus,
  ICircuitSimulationExecution,
} from '@/api/entitycore/types/entities/circuit-simulation-execution';
import { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { getLatestSimExecStatus } from '@/features/small-microcircuit/_components/utils';
import { SimExecStatusMap } from '@/features/small-microcircuit/types';
import { WorkspaceContext } from '@/types/common';
import { atomFamilyWithExpiration, readAtomFamilyWithExpiration } from '@/util/atoms';

const simExecBySimIdAtomFamily = readAtomFamilyWithExpiration(
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

export const simExecRemoteStatusMapAtomFamily = atomFamilyWithExpiration(
  ({ simulationIds, context }: { simulationIds: string[]; context: WorkspaceContext }) =>
    atomWithRefresh<Promise<SimExecStatusMap>>(async () => {
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

type SimExecStatusMapAtomFamilyArg = { simulationIds: string[]; context: WorkspaceContext };

export const simExecStatusMapAtomFamily = atomFamilyWithExpiration(
  ({ simulationIds, context }: SimExecStatusMapAtomFamilyArg) => {
    const simExecRemoteStatusMapAtom = simExecRemoteStatusMapAtomFamily({
      simulationIds,
      context,
    });

    const localStatusMapAtom = atom<SimExecStatusMap>(new Map());

    return atom<Promise<SimExecStatusMap>, [SimExecStatusMap], void>(
      async (get) => {
        const remoteStatusMap = await get(simExecRemoteStatusMapAtom);
        const localStatusMap = get(localStatusMapAtom);

        const statusMap = simulationIds.reduce((map, simId) => {
          const remoteStatus = remoteStatusMap.get(simId);
          const localStatus = localStatusMap.get(simId);
          // If both are set we take the latest possible one,
          // because the status change in a particular sequence.
          // See definition of getLatestSimExecStatus
          const status =
            remoteStatus && localStatus
              ? getLatestSimExecStatus(remoteStatus, localStatus)
              : (localStatus ?? remoteStatus ?? CircuitSimulationExecutionStatus.CREATED);
          return map.set(simId, status);
        }, new Map());

        return statusMap;
      },
      (get, set, newStatusMap) => set(localStatusMapAtom, new Map(newStatusMap))
    );
  },
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
    entityType: TEntityTypeDict;
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
