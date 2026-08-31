import type { ComponentProps } from 'react';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type {
  EntityCoreIdentifiableNamed,
  EntityCoreResponse,
} from '@/api/entitycore/types/shared/global';
import type { TViewVariant, TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { TFacets } from '@/features/data-grid/core';
import type { WorkspaceContext } from '@/types/common';
import type { MiniDetailView } from '@/ui/segments/mini-detail-view';

/**
 * Row-interaction options for a listing. Previously derived from the antd table's own
 * props; declared explicitly here so the listing contract does not depend on a
 * rendering component.
 */
export type ListingTableProps<Row = EntityCoreIdentifiableNamed> = {
  /** renders a selection column: radio for single-select pickers, checkbox for multi */
  selectionType?: 'checkbox' | 'radio';
  /** controlled selection; pair with {@link onRowsSelected} */
  selectedRows?: Row[];
  onRowsSelected?: (rows: Row[]) => void;
  /** row click handler; when set it replaces opening the mini-detail panel */
  onCellClick?: (basePath: string, record: Row, type: TExtendedEntitiesTypeDict) => void;
};

export type BrowseEntityScopeProps = {
  id?: string;
  section?: TWorkspaceSection;
  /** when omitted, derived from `dataType` (brain hierarchy only for single-neuron simulations in data) */
  requireBrainRegion?: boolean;
  /** whether to display the mini detail view */
  requireMiniDetailView?: boolean;
  classNames?: {
    container?: ComponentProps<'div'>['className'];
    miniView?: ComponentProps<'div'>['className'];
    filterClassNames?: {
      container?: string;
      speciesSelector?: string;
    };
    tableClassNames?: {
      table?: ComponentProps<'div'>['className'];
      container?: ComponentProps<'div'>['className'];
    };
  };
  scope?: TWorkspaceScope;
  defaultBrainRegion?: string;
  dataType: TExtendedEntitiesTypeDict;
  mainTableProps?: ListingTableProps;
  miniViewProps?: Partial<ComponentProps<typeof MiniDetailView>>;
  /** whether to display the download button */
  allowDownload?: boolean;
  /** whether to display the delete button */
  allowDelete?: boolean;
  /** whether to display the filter controls */
  allowFilter?: boolean;
  /** whether to display the search input */
  allowSearch?: boolean;
  /**
   * when false, disables the fetch query
   * this is useful where the query is already filtered
   * and we don't want to fetch the data again.
   */
  allowQuery?: boolean;
  /** whether to display the brain region dropdown */
  requireSpeciesSelector?: boolean;
  requireScopeSelector?: boolean;
  requireEntityTypeSelector?: {
    value: TExtendedEntitiesTypeDict;
    options: Array<{
      label: string;
      value: TExtendedEntitiesTypeDict;
      count?: number;
    }>;
    enabled: boolean;
    onSelect: (value: TExtendedEntitiesTypeDict) => void;
  };
  extraQueryParams?: Record<string, unknown>;
  detailVariant?: TViewVariant;
  /** When true, list content sits on a white inset panel — use default pagination styling */
  contentOnInsetPanel?: boolean;
  /**
   * optional override for the list fetch. when provided, replaces the entity's domain
   * `query.list` (a "loader")
   * rows still render with `dataType` columns/mini-detail, so
   * the override MUST return rows in the standard entity shape and carry server-side
   * pagination.
   * facets default to the entity facet endpoint (not loader-scoped) unless
   * {@link facetsQueryFn} is provided.
   */
  listQueryFn?: (args: {
    filters: Record<string, unknown>;
    withFacets?: boolean;
    context: WorkspaceContext;
  }) => Promise<EntityCoreResponse<EntityCoreIdentifiableNamed> | undefined>;
  /**
   * optional facets override. when provided, facets are computed by this instead of the
   * default entity facet endpoint — for loaders that have a properly scoped facet query.
   */
  facetsQueryFn?: (args: {
    filters: Record<string, unknown>;
    context: WorkspaceContext;
  }) => Promise<TFacets | undefined>;
};
