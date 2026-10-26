import { hasAssets } from '@/api/entitycore/guards';
import { getEntity } from '@/api/entitycore/queries/general/entity';
import { getTaskResult } from '@/api/entitycore/queries/task';
import { EntityTypeDict } from '@/api/entitycore/types/entity-type';
import { AssetContentType, AssetLabel } from '@/api/entitycore/types/shared/global';
import { getExtendedTypeByTaskResultType } from '@/entity-configuration/domain/helpers';
import { retrieveEntity } from '@/entity-configuration/domain/requests';
import { ActivityCustomFileRenderer } from '@/features/scan-config/types';
import { MAX_VISUALIZATION_ASSET_REFETCH_RETRIES } from '@/features/task-runner';

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
 * Assets stored under a generic content type whose content the code viewer can show. The viewer
 * keeps `text/plain` on its placeholder, since that also marks files of unknown format; a
 * validation summary is JSON written to a `.txt` file, so it is named here.
 */
const ENFORCED_RENDER_TYPE_BY_LABEL: Partial<Record<string, AssetContentType>> = {
  [AssetLabel.validation_result_details]: AssetContentType.json,
};

/**
 * `hasAssets` accepts a record whose `assets` is null — and the field is typed non-nullable, so
 * TypeScript does not flag the dereference either. Every read goes through this.
 */
function assetsOf(entity: TOutputEntity): readonly IAsset[] {
  return hasAssets(entity) && Array.isArray(entity.assets) ? entity.assets : [];
}

function makeMiniDetailFile(
  entity: TOutputEntity,
  dataType: TExtendedEntitiesTypeDict | undefined
): TActivityCustomFile[] {
  // A mini-detail row stands for the entity and is rendered from the record, not a file, so it
  // carries no asset — an e-model, circuit or me-model alike.
  return [
    {
      id: entity.id,
      entity,
      name: entity.name,
      dataType: dataType ?? (entity.type as TExtendedEntitiesTypeDict),
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
      // a `generated` ref only says `task_result`; the kind lives on the record. An unregistered
      // kind gets `undefined`, and its assets still render.
      extendedType: getExtendedTypeByTaskResultType(entity.task_result_type),
    };
  },
  toFiles: ({ entity, extendedType }) => [
    ...(extendedType ? makeMiniDetailFile(entity, extendedType) : []),
    ...assetsOf(entity).map((asset) => ({
      id: asset.id,
      entity,
      asset,
      name: asset.path,
      renderer: ActivityCustomFileRenderer.Default,
      enforcedRenderType: ENFORCED_RENDER_TYPE_BY_LABEL[asset.label],
    })),
  ],
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
  toFiles: ({ entity, extendedType }) => makeMiniDetailFile(entity, extendedType),
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
  toFiles: ({ entity, extendedType }) => makeMiniDetailFile(entity, extendedType),
};

/**
 * A validation result of an e-model. A validation run registers one overall result and one per
 * protocol next to its task result, but they have no entity configuration to open in, and the
 * task result's summary already lists their scores, so they get no row of their own.
 */
const validationResultStrategy: TOutputStrategy = {
  id: 'validation-result',
  matches: (ref) => ref.type === EntityTypeDict.ValidationResult,
  resolve: async () => null,
  toFiles: () => [],
};

/** First match wins, so the specific strategies come before the catch-all. */
export const OUTPUT_STRATEGIES: readonly TOutputStrategy[] = [
  taskResultStrategy,
  validationResultStrategy,
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
