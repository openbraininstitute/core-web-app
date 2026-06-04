import type { ComponentType } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { EntityCoreIdentifiableNamed } from '@/api/entitycore/types/shared/global';
import type { EntityCoreResponse, TFacets } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';

/**
 * this sets up how the browse step works when you're starting a new workflow
 *
 * it's basically got two parts you can mix and match per entity type, so when you switch
 * between types the browse step can follow different rules:
 *
 * - prerequisite: the thing you pick first, it drives the table but it's throwaway ui
 *   state and never gets saved into the config
 * - loader: the way the table grabs each page, if you skip it we'll just use the
 *   entity's default query
 */
export type TWorkflowBrowseConfig = Partial<
  Record<TExtendedEntitiesTypeDict, TWorkflowBrowseEntry>
>;

export type TWorkflowBrowseEntry = {
  /** optional pre-step the user resolves before the entity table renders */
  prerequisite?: TBrowsePrerequisite;
  /** optional fetch override, when omitted the table uses the entity's domain query */
  loader?: TBrowseLoader;
};

/**
 * identifies the prerequisite's entity type, may be a registered extended type, or a label-only
 * type string (e.g. EM dense reconstruction dataset) that has no standard browse entry
 * `string & {}` preserves autocomplete for known types while allowing the rest
 */
export type TBrowsePrerequisiteEntityType = TExtendedEntitiesTypeDict | (string & {});

/** the value produced when the user picks an prerequisite, fed into the loader */
export type TBrowsePrerequisiteValue = {
  type: TBrowsePrerequisiteEntityType;
  id: string;
  /** the selected row, kept for display */
  row: EntityCoreIdentifiableNamed;
};

export type TBrowsePrerequisitePickerProps = {
  value: TBrowsePrerequisiteValue | null;
  onSelect: (value: TBrowsePrerequisiteValue) => void;
};

/**
 * how the prerequisite picker is drawn, today only `cards`, `table` and `custom` are reserved so
 * the picker presentation can change without touching loader / selection / configure code
 */
export type TBrowsePrerequisitePresentation =
  | { kind: 'cards' } // not implemented yet
  | { kind: 'table' } // not implemented yet
  | { kind: 'custom'; render: ComponentType<TBrowsePrerequisitePickerProps> };

export type TBrowsePrerequisite = {
  /**
   * prerequisite entity type, may be an extended entity type, or a label-only type that is not
   * registered for standard browse (e.g. EM dense reconstruction dataset) when the picker
   * uses its own data source via `presentation`
   */
  entityType: TBrowsePrerequisiteEntityType;
  /** human label for the pre-step header */
  label: string;
  /** when true, the entity table is gated until an prerequisite is chosen */
  required?: boolean /**
   * opt-in sharing, browse entries whose prerequisites declare the **same** `shareKey` share a
   * single prerequisite selection: the user picks it once and it applies to every type in the
   * group (e.g. one EM dataset scoping both Cell morphology and ME-model in EM synaptome)
   *
   * omit it for an independent (types have different prerequisites) prerequisite:
   * each entity type then picks its own, even when the `entityType` is the same
   */;
  shareKey?: string;
  presentation: TBrowsePrerequisitePresentation;
};

/**
 * drop-in signature mirroring the entity domain `query.list`, so a custom loader can be
 * passed straight to {@link BrowseEntityScope} as `listQueryFn`, the prerequisite selection is
 * captured by closure when the loader is built (see `listing.tsx`)
 */
export type TBrowseListQueryFn = (args: {
  filters: Record<string, unknown>;
  withFacets?: boolean;
  context: WorkspaceContext;
}) => Promise<EntityCoreResponse<EntityCoreIdentifiableNamed> | undefined>;

/**
 * facets query for a custom loader: computes facet buckets for the loader's filtered set
 *
 * independent of the paginated list query — it should facet over the **whole** filtered set
 * (not just the current page), returns `undefined` to mean "no facets"
 */
export type TBrowseFacetsQueryFn = (args: {
  filters: Record<string, unknown>;
  context: WorkspaceContext;
}) => Promise<TFacets | undefined>;

export type TBrowseLoader =
  /** use the entity's own domain query unchanged */
  | { kind: 'default' }
  /**
   * replace the fetch entirely with a paginated custom query, `build` receives the prerequisite
   * and returns a {@link TBrowseListQueryFn}
   *
   * `facets` (optional) supplies a dedicated facets query that mirrors the loader's
   * filtering but requests faceting from the right endpoint, omit it → facets are disabled
   * for this loader
   */
  | {
      kind: 'custom';
      build: (prerequisite: TBrowsePrerequisiteValue | null) => TBrowseListQueryFn;
      facets?: { build: (prerequisite: TBrowsePrerequisiteValue | null) => TBrowseFacetsQueryFn };
    };
