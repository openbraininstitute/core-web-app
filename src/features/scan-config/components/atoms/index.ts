import { useQuery } from '@tanstack/react-query';
import { isEqual } from 'es-toolkit/compat';
import { atom } from 'jotai';
import { atomWithRefresh } from 'jotai/utils';
import { match } from 'ts-pattern';

import { getMEModel } from '@/api/entitycore/queries';
import { downloadAsset } from '@/api/entitycore/queries/assets';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getCircuit } from '@/api/entitycore/queries/model/circuit';
import { getIonChannelModel } from '@/api/entitycore/queries/model/ion-channel-model';
import { getCircuitSimulations } from '@/api/entitycore/queries/simulation/circuit-simulation';
import { getCircuitSimulationExecutions } from '@/api/entitycore/queries/simulation/circuit-simulation-execution';
import { getCircuitSimulationResult } from '@/api/entitycore/queries/simulation/circuit-simulation-result';
import { EntityTypeDict, type IMEModel, type TEntityTypeDict } from '@/api/entitycore/types';
import { ActivityStatus } from '@/api/entitycore/types/shared/activity';
import { resolveExecutions } from '@/entity-configuration/domain/simulation/small-microcircuit-simulation';
import { hasSimConfigAsset } from '@/entity-configuration/domain/simulation/utils';
import { getLatestSimExecStatus } from '@/features/scan-config/components/utils';
import { keyBuilder } from '@/ui/use-query-keys/data';
import { atomFamilyWithExpiration, readAtomFamilyWithExpiration } from '@/util/atoms';

import type { ICircuit } from '@/api/entitycore/types/entities/circuit';
import type { IExecutionActivity } from '@/api/entitycore/types/entities/execution';
import type { IonChannelModel } from '@/api/entitycore/types/entities/ion-channel';
import type { ISimulation } from '@/api/entitycore/types/entities/simulation';
import type { ISimulationResult } from '@/api/entitycore/types/entities/simulation-result';
import type { SimExecStatusMap } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';
import type { Nullish } from '@/utils/type';

const simExecBySimIdAtomFamily = readAtomFamilyWithExpiration(
  ({ simulationId, context }: { simulationId: string; context: WorkspaceContext }) =>
    atom<Promise<IExecutionActivity>>(async () => {
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
  ({ campaignId, context }: { campaignId: string; context: WorkspaceContext }) =>
    atomWithRefresh<Promise<SimExecStatusMap>>(async (get) => {
      const simulationsAtom = simulationsByCampaignIdAtomFamily({
        campaignId,
        context,
      });
      const simulations = await get(simulationsAtom);
      const simulationIds = simulations.map((s) => s.id);

      const simExecutions = await resolveExecutions({
        context,
        allSimIds: simulationIds,
      });

      const executionsGrouped = simExecutions.reduce<Map<string, IExecutionActivity[]>>(
        (map, exec) => map.set(exec.used[0].id, [...(map.get(exec.used[0].id) ?? []), exec]),
        new Map()
      );

      Array.from(executionsGrouped.values()).forEach(
        (executions) =>
          void executions.sort((a, b) => b.creation_date.localeCompare(a.creation_date))
      );

      return Array.from(executionsGrouped.keys()).reduce(
        (map, simId) => map.set(simId, executionsGrouped.get(simId)![0].status),
        new Map()
      );
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

type SimExecStatusMapAtomFamilyArg = {
  campaignId: string;
  context: WorkspaceContext;
};

export const simExecStatusMapAtomFamily = atomFamilyWithExpiration(
  ({ campaignId, context }: SimExecStatusMapAtomFamilyArg) => {
    const simExecRemoteStatusMapAtom = simExecRemoteStatusMapAtomFamily({
      campaignId,
      context,
    });

    const localStatusMapAtom = atom<SimExecStatusMap>(new Map());

    return atom<Promise<SimExecStatusMap>, [string, ActivityStatus], void>(
      async (get) => {
        const simulationsAtom = simulationsByCampaignIdAtomFamily({
          campaignId,
          context,
        });
        const simulations = await get(simulationsAtom);

        const remoteStatusMap = await get(simExecRemoteStatusMapAtom);
        const localStatusMap = get(localStatusMapAtom);

        const statusMap = simulations.reduce((map, sim) => {
          const remoteStatus = remoteStatusMap.get(sim.id);
          const localStatus = localStatusMap.get(sim.id);

          // Simple validity check: if there is no sonata sim config asset we set error status.
          if (!hasSimConfigAsset(sim)) {
            return map.set(sim.id, ActivityStatus.ERROR);
          }

          // If both statuses are set we take the latest possible one,
          // because the status change in a particular sequence.
          // See definition of getLatestSimExecStatus
          const status =
            remoteStatus && localStatus
              ? getLatestSimExecStatus(remoteStatus, localStatus)
              : (localStatus ?? remoteStatus ?? ActivityStatus.CREATED);

          return map.set(sim.id, status);
        }, new Map());

        return statusMap;
      },
      (get, set, simId, status) => {
        const newStatusMap = new Map(get(localStatusMapAtom)).set(simId, status as ActivityStatus);
        set(localStatusMapAtom, newStatusMap);
      }
    );
  },
  {
    ttl: 2 * 60 * 1000, // 2 minutes
    areEqual: isEqual,
  }
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
    atom<Promise<ISimulationResult | null>>(async (get) => {
      if (!enabled) {
        return null;
      }

      const execution = await get(simExecBySimIdAtomFamily({ simulationId, context }));

      if (!execution?.generated?.[0]) {
        return null;
      }

      return getCircuitSimulationResult({
        id: execution.generated[0].id,
        context,
      });
    }),
  {
    ttl: 120000, // 2 minutes
    areEqual: isEqual,
  }
);

export const simulationsByCampaignIdAtomFamily = readAtomFamilyWithExpiration(
  ({ campaignId, context }: { campaignId: string; context: WorkspaceContext }) =>
    atom<Promise<ISimulation[]>>(async () => {
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
  }
);

export function useModelQuery({
  id,
  context,
}: {
  id: string | Nullish;
  context: WorkspaceContext;
}) {
  const params = { id, context };
  const {
    data: entityType,
    isLoading: entityLoading,
    error: entityError,
  } = useQuery({
    // @ts-expect-error this query won't start without the id
    queryKey: keyBuilder.entity({ id, context }),
    // @ts-expect-error this query won't start without the id
    queryFn: () => getEntity(params),
    select: (r) => r.type,
    enabled: !!id,
  });

  const {
    data: entity,
    isLoading: modelLoading,
    error: modelError,
  } = useQuery<ICircuit | IMEModel | IonChannelModel, Error, ICircuit | IMEModel | IonChannelModel>(
    {
      // @ts-expect-error this query won't start without the id
      queryKey: keyBuilder.entity({ id, context, type: entityType }),
      queryFn: () => {
        return (
          match(entityType)
            // @ts-expect-error this query won't start without the id
            .with(EntityTypeDict.Circuit, () => getCircuit(params))
            // @ts-expect-error this query won't start without the id
            .with(EntityTypeDict.Memodel, () => getMEModel(params))
            .with(EntityTypeDict.IonChannelModel, () =>
              // @ts-expect-error this query won't start without the id
              getIonChannelModel(params)
            )
            .otherwise((entityType) => {
              throw new Error(`Unsupported model entity type ${entityType}`);
            })
        );
      },
      enabled: !!entityType && !!id,
      refetchOnWindowFocus: false,
    }
  );

  const isLoading = entityLoading || modelLoading;
  const error = entityError || modelError;

  return { entity, isLoading, error };
}

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
  }
);
