import type { EntityCoreObjectTypes } from '@/api/entitycore/types';
import type { ITaskActivityEntityRef } from '@/api/entitycore/types/entities/task-activity';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreBaseAsset } from '@/api/entitycore/types/shared/global';
import type { TActivityCustomFile } from '@/features/scan-config/types';
import type { WorkspaceContext } from '@/types/common';

/** One entry of a task activity's `generated` array — what a run produced. */
export type TGeneratedRef = ITaskActivityEntityRef;

/** Any entity a run can generate; assets are optional because not every type carries them. */
export type TOutputEntity = EntityCoreObjectTypes &
  Partial<EntityCoreBaseAsset> & { name?: string };

/** A `generated` ref after its entity has been fetched. */
export type TResolvedOutput = {
  ref: TGeneratedRef;
  /** id of the strategy that produced this, so later steps don't re-resolve from an untyped ref */
  strategyId: string;
  entity: TOutputEntity;
  /**
   * The entity's *extended* type, which a ref does not carry: refs hold the entitycore type
   * (`task_result`), while several virtual types can share it. Strategies that need a discriminator
   * from the record itself resolve it here.
   */
  extendedType: TExtendedEntitiesTypeDict | undefined;
};

/**
 * How one kind of workflow output is fetched and presented.
 *
 * A run's outputs are whatever entities its activity generated, and different workflows generate
 * different shapes — a circuit, a set of morphologies, a task result holding several assets. Each
 * shape is one strategy, so supporting a new one means adding an entry to the registry rather than
 * branching inside the components that render the files.
 */
export type TOutputStrategy = {
  /** stable identifier, used in query keys and for debugging */
  id: string;
  /** whether this strategy owns the given ref; the first match in registry order wins */
  matches: (ref: TGeneratedRef) => boolean;
  /** fetch the entity behind the ref; return null when it cannot be resolved */
  resolve: (args: {
    ref: TGeneratedRef;
    context: WorkspaceContext;
  }) => Promise<TResolvedOutput | null>;
  /** turn the resolved entity into the file rows the output panel lists */
  toFiles: (resolved: TResolvedOutput) => TActivityCustomFile[];
  /**
   * Poll interval in ms while an asset the run writes after finishing is still missing, or false
   * to stop. Only consulted when the caller enables polling.
   */
  refetchInterval?: (args: {
    data: TResolvedOutput | undefined;
    dataUpdateCount: number;
  }) => number | false;
};
