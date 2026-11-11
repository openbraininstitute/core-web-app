import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Config, ConfigSchema, ConfigValue, TBlock } from '@/features/scan-config/types';
import type {
  TWorkflowSessionSelectionPayload,
  TWorkflowSessionSelectionRef,
} from '@/features/scan-config/workflow/workflow-session-selection';

/**
 * Entity facts a scan-config schema may test through `entity_query.filters` when several block
 * variants accept the same entity type (e.g. an ion channel model with or without a conductance).
 */
export type TWorkflowSeedAttributes = Record<string, string | number | boolean | null>;

/**
 * A value derived from the seeded entity, keyed by ObiOne's `property` annotation
 * (e.g. `RecordableVariables`). One block entry is created per item in `values`.
 */
export type TWorkflowSeedProperty = {
  property: string;
  values: Array<Record<string, ConfigValue>>;
};

/** What a launcher carries into a scan-config editor alongside the entity id. */
export type TWorkflowEntitySeed = {
  attributes?: TWorkflowSeedAttributes;
  properties?: TWorkflowSeedProperty[];
};

/** A place in the config where a seeded value belongs. */
export type TBlockSeedTarget = {
  /** root block-dictionary key, e.g. `ion_channel_models` */
  rootKey: string;
  /** the dictionary variant to instantiate */
  variant: TBlock;
  /** field on that variant receiving the seeded value */
  fieldKey: string;
};

export type TResolveFromIdType = (browseType: TExtendedEntitiesTypeDict) => string | undefined;

/** Everything {@link WorkflowSeed.applyTo} needs to turn a stored selection into editor state. */
export type TWorkflowSeedApplyArgs = {
  config: Config;
  schema: ConfigSchema;
  sessionSelection: TWorkflowSessionSelectionPayload;
  resolveFromIdType: TResolveFromIdType;
};

/** One selection ref being written into the config, as handed to {@link WorkflowSeed.do}. */
export type TWorkflowSeedContext = {
  config: Config;
  schema: ConfigSchema;
  ref: TWorkflowSessionSelectionRef;
  /** ObiOne FromID const for `ref.type`, e.g. `IonChannelModelFromID` */
  fromIdType: string;
  /** entry names already taken across every block dictionary; seeded names are added to it */
  usedNames: Set<string>;
};
