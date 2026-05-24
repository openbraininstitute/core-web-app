import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { TModelIdentifierFieldStorageMode } from '@/features/scan-config/workflow/workflow-schema-selection';

/** obiOne FromID reference written under an `initialize` model field */
export type TFromIdRef = {
  /** fromID const string (e.g. `CellMorphologyFromID`) */
  type: string;
  /** entity uuid */
  id_str: string;
};

/** namedTuple group shape for grouped `model_identifier_multiple` fields */
export type TModelIdentifierGroup = {
  name: string;
  elements: TFromIdRef[];
};

/**
 * normalized field value after {@link parseModelIdentifierFieldValue}.
 *
 * discriminated by `storageMode`: list/tuple use `items`, grouped uses `groups`
 */
export type TModelIdentifierParsedValue =
  | {
      storageMode: Extract<TModelIdentifierFieldStorageMode, 'list' | 'tuple'>;
      items: TFromIdRef[];
    }
  | {
      storageMode: Extract<TModelIdentifierFieldStorageMode, 'grouped'>;
      groups: TModelIdentifierGroup[];
    };

/** merged schema + workflow registry input for browse entity-type selector */
export type TModelIdentifierConfigurationInput = {
  type: TExtendedEntitiesTypeDict;
  label: string;
  filters?: Record<string, unknown>;
};

/** entity record returned by {@link useResolvedModelIdentifierEntities} */
export type TResolvedModelIdentifierEntity = EntityCoreIdentifiableNamed & {
  entityType: TExtendedEntitiesTypeDict;
  fromIdType: string;
};

/** in-memory browse overlay cart keyed by extended entity type */
export type TModelIdentifierBrowseSelectionsByType = Partial<
  Record<TExtendedEntitiesTypeDict, EntityCoreIdentifiableNamed[]>
>;
