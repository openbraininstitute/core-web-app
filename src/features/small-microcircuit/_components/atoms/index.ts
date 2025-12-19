import isEqual from 'es-toolkit/compat/isEqual';
import { atom } from 'jotai';
import { atomWithRefresh } from 'jotai/utils';
import { match } from 'ts-pattern';

import { getMEModel } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { EntityTypeDict, type IMEModel, type TEntityTypeDict } from '@/api/entitycore/types';
import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { ICircuitSimulation } from '@/api/entitycore/types/entities/circuit-simulation';
import type { ICircuitSimulationExecution } from '@/api/entitycore/types/entities/circuit-simulation-execution';
import type { ICircuitSimulationResult } from '@/api/entitycore/types/entities/circuit-simulation-result';
import { EntitycoreExecutionStatus } from '@/api/entitycore/types/entities/execution';
import { resolveExecutions } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { getLatestSimExecStatus } from '@/features/small-microcircuit/_components/utils';
import type { SimExecStatusMap } from '@/features/small-microcircuit/types';
import type { WorkspaceContext } from '@/types/common';
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
  },
);

export const simExecRemoteStatusMapAtomFamily = atomFamilyWithExpiration(
  ({ simulationIds, context }: { simulationIds: string[]; context: WorkspaceContext }) =>
    atomWithRefresh<Promise<SimExecStatusMap>>(async () => {
      const simExecutions = await resolveExecutions({
        context,
        allSimIds: simulationIds,
      });

      const executionsGrouped = simExecutions.reduce<Map<string, ICircuitSimulationExecution[]>>(
        (map, exec) => map.set(exec.used[0].id, [...(map.get(exec.used[0].id) ?? []), exec]),
        new Map(),
      );

      Array.from(executionsGrouped.values()).forEach((executions) =>
        executions.sort((a, b) => b.creation_date.localeCompare(a.creation_date)),
      );

      return Array.from(executionsGrouped.keys()).reduce(
        (map, simId) => map.set(simId, executionsGrouped.get(simId)?.[0].status),
        new Map(),
      );
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  },
);

type SimExecStatusMapAtomFamilyArg = {
  simulationIds: string[];
  context: WorkspaceContext;
};

export const simExecStatusMapAtomFamily = atomFamilyWithExpiration(
  ({ simulationIds, context }: SimExecStatusMapAtomFamilyArg) => {
    const simExecRemoteStatusMapAtom = simExecRemoteStatusMapAtomFamily({
      simulationIds,
      context,
    });

    const localStatusMapAtom = atom<SimExecStatusMap>(new Map());

    return atom<Promise<SimExecStatusMap>, [string, EntitycoreExecutionStatus], void>(
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
              : (localStatus ?? remoteStatus ?? EntitycoreExecutionStatus.CREATED);

          return map.set(simId, status);
        }, new Map());

        return statusMap;
      },
      (get, set, simId, status) => {
        const newStatusMap = new Map(get(localStatusMapAtom)).set(
          simId,
          status as EntitycoreExecutionStatus,
        );
        set(localStatusMapAtom, newStatusMap);
      },
    );
  },
  {
    ttl: 2 * 60 * 1000, // 2 minutes
    areEqual: isEqual,
  },
);

export const simResultBySimIdAtomFamily = readAtomFamilyWithExpiration(
  ({
    simulationId,
    context,
    enabled = true,
  }: {
    simulationId: string;
    context: WorkspaceContext;
    enabled?: boolean;
  }) =>
    atom<Promise<ICircuitSimulationResult | null>>(async (get) => {
      if (!enabled) {
        return null;
      }

      const execution = await get(simExecBySimIdAtomFamily({ simulationId, context }));

      if (!execution?.generated?.[0]) {
        throw new Error('Simulation Result not found');
      }

      return getCircuitSimulationResult({
        id: execution.generated[0].id,
        context,
      });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  },
);

export const simulationsByCampaignIdAtomFamily = readAtomFamilyWithExpiration(
  ({ campaignId, context }: { campaignId: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuitSimulation[]>>(async () => {
      const filters = { simulation_campaign_id: campaignId };
      const res = await getCircuitSimulations({ filters, context });

      const simulations = res.data;

      // To correctly sort simulations by name which might contain a simulation index.
      const collator = new Intl.Collator(undefined, {
        numeric: true,
        sensitivity: 'base',
      });
      const sortedSimulations = simulations.sort((a, b) => collator.compare(a.name, b.name));

      return sortedSimulations;
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  },
);

// TODO Refactor to use tanstack query
export const modelAtomFamily = readAtomFamilyWithExpiration(
  ({ id, context }: { id: string; context: WorkspaceContext }) =>
    atom<Promise<ICircuit | IMEModel>>(async () => {
      if (!id) {
        throw new Error(`No model ID provided`);
      }

      const params = { id, context };

      const modelEntityBase = await getEntity(params);

      return match(modelEntityBase.type)
        .with(EntityTypeDict.Circuit, () => getCircuit(params))
        .with(EntityTypeDict.Memodel, () => getMEModel(params))
        .otherwise((entityType) => {
          throw new Error(`Unsupported model entity type ${entityType}`);
        });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  },
);

export const jsonFileAtomFamily = readAtomFamilyWithExpiration(
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
    atom<Promise<any>>(async () => {
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
  },
);
