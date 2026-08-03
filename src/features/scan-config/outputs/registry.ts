import { hasAssets } from '@/api/entitycore/guards';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getTaskResult } from '@/api/entitycore/queries/task';
import { TaskResultType } from '@/api/entitycore/types/entities/task-result';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { ExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import { AssetLabel } from '@/api/entitycore/types/shared/global';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import { MAX_VISUALIZATION_ASSET_REFETCH_RETRIES } from '@/features/task-runner';

import type { TTaskResultType } from '@/api/entitycore/types/entities/task-result';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { IAsset } from '@/api/entitycore/types/shared/global';
import type {
  TOutputEntity,
  TOutputStrategy,
  TResolvedOutput,
} from '@/features/scan-config/outputs/types';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

/**
 * Which virtual entity type a task result of a given kind is configured under.
 *
 * A `generated` ref only says `task_result`; the kind lives on the record, so the extended type —
 * and with it the entity configuration, detail view and slug — can only be resolved after fetching.
 * A result kind absent from this map still renders its assets, it just has no entity config behind
 * it, so add an entry when you register one.
 */
const TASK_RESULT_EXTENDED_TYPE: Partial<Record<TTaskResultType, TExtendedEntitiesTypeDict>> = {
  [TaskResultType.EFeatureExtractionResult]: ExtendedEntitiesTypeDict.EFeatureExtractionResult,
};

/**
 * `hasAssets` accepts a record whose `assets` is null — and the field is typed non-nullable, so
 * TypeScript does not flag the dereference either. Every read goes through this.
 */
function assetsOf(entity: TOutputEntity): readonly IAsset[] {
  return hasAssets(entity) && Array.isArray(entity.assets) ? entity.assets : [];
}

function makeMiniDetailFile(entity: TOutputEntity): TActivityCustomFile[] {
  const [asset] = assetsOf(entity);
  if (!asset) return [];

  return [
    {
      id: entity.id,
      entity,
      asset,
      name: entity.name,
      renderer: ActivityCustomFileRenderer.MiniDetailView,
    },
  ];
}

/**
 * A task result the run produced.
 *
 * Its value is the files it carries — an extraction writes one asset per artefact — so every asset
 * is listed rather than only the first, which is what a single mini-detail row would show.
 */
const taskResultStrategy: TOutputStrategy = {
  id: 'task-result',
  matches: (ref) => ref.type === EntityTypeDict.TaskResult,
  resolve: async ({ ref, context }) => {
    const entity = await getTaskResult({ id: ref.id, context });
    if (!entity) return null;

    return {
      ref,
      strategyId: taskResultStrategy.id,
      entity: entity as unknown as TOutputEntity,
      extendedType: TASK_RESULT_EXTENDED_TYPE[entity.task_result_type],
    };
  },
  toFiles: ({ entity }) =>
    assetsOf(entity).map((asset) => ({
      id: asset.id,
      entity,
      asset,
      name: asset.path,
      renderer: ActivityCustomFileRenderer.Default,
    })),
};

function makeRegisteredEntityResolver(strategyId: string) {
  return async ({
    ref,
    context,
  }: {
    ref: { id: string; type?: string | null };
    context: WorkspaceContext;
  }) => {
    const extendedType = ref.type as TExtendedEntitiesTypeDict;
    const entity = await retrieveEntity({ type: extendedType, id: ref.id, ctx: context });
    if (!entity) return null;

    return { ref, strategyId, entity: entity as unknown as TOutputEntity, extendedType };
  };
}

/**
 * An extracted circuit.
 *
 * Its visualization asset is written a little after the run reports done, so the record is polled
 * until that asset lands — otherwise the output opens on a circuit that cannot yet be displayed.
 */
const circuitStrategy: TOutputStrategy = {
  id: 'circuit',
  matches: (ref) => ref.type === EntityTypeDict.Circuit,
  resolve: makeRegisteredEntityResolver('circuit'),
  toFiles: ({ entity }) => makeMiniDetailFile(entity),
  refetchInterval: ({ data, dataUpdateCount }) => {
    const hasVisualization = data
      ? assetsOf(data.entity).some((asset) => asset.label === AssetLabel.circuit_visualization)
      : false;

    if (hasVisualization || dataUpdateCount >= MAX_VISUALIZATION_ASSET_REFETCH_RETRIES)
      return false;
    return 2_000;
  },
};

/**
 * Anything whose ref type is already an entity configuration's extended type — a morphology, a
 * mesh. Shown as a mini-detail row, which is what those views are registered for.
 */
const registeredEntityStrategy: TOutputStrategy = {
  id: 'registered-entity',
  matches: (ref) => !!ref.type,
  resolve: makeRegisteredEntityResolver('registered-entity'),
  toFiles: ({ entity }) => makeMiniDetailFile(entity),
};

/** First match wins, so the specific strategies come before the catch-all. */
export const OUTPUT_STRATEGIES: readonly TOutputStrategy[] = [
  taskResultStrategy,
  circuitStrategy,
  registeredEntityStrategy,
];

export function resolveOutputStrategy(ref: {
  type?: string | null;
  id: string;
}): TOutputStrategy | null {
  return OUTPUT_STRATEGIES.find((strategy) => strategy.matches(ref)) ?? null;
}

export function getOutputStrategyById(id: string | undefined): TOutputStrategy | null {
  return OUTPUT_STRATEGIES.find((strategy) => strategy.id === id) ?? null;
}

/**
 * Pick the strategy for a ref, asking the API for the entity's type when the ref omits it.
 *
 * `generated` entries are not guaranteed to carry `type` — the build use case runs the same
 * lookup for the same reason. Keying off the ref alone would leave a typeless ref with no
 * strategy and no output at all, where the previous code simply fetched it.
 */
export async function resolveStrategyForRef({
  ref,
  context,
}: {
  ref: { id: string; type?: string | null };
  context: WorkspaceContext;
}): Promise<{ strategy: TOutputStrategy; ref: { id: string; type?: string | null } } | null> {
  if (ref.type) {
    const strategy = resolveOutputStrategy(ref);
    return strategy ? { strategy, ref } : null;
  }

  const entity = await getEntity({ id: ref.id, context });
  const typedRef = { ...ref, type: entity?.type };
  const strategy = resolveOutputStrategy(typedRef);

  return strategy ? { strategy, ref: typedRef } : null;
}

export type { TResolvedOutput };
