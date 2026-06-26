'use client';

import { compact } from 'es-toolkit/compat';

import { DEFAULT_PAGE_NUMBER } from '@/constants';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  collectDefaultActiveColumns,
  collectListingFieldKeys,
  isFieldListedInFilterPanel,
  resolveFieldListing,
} from '@/entity-configuration/definitions/listing';
import {
  SortOrder,
  type TCoreFilter,
  type TFieldApiContext,
  type TSortOrder,
  type TSortState,
  type TSortStateList,
} from '@/entity-configuration/definitions/types';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { columnKeyToFilter } from '@/ui/segments/data-table/elements/column-key-to-filter';
import {
  CircuitRepresentationView,
  type TCircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { Nullable } from '@/utils/type';

type TDefaultListingContext = TFieldApiContext;

export const makeTypeDefaultFilters = (listing: TDefaultListingContext) => {
  const view = getViewDefinitionByExtendedType(listing.dataType);

  return collectListingFieldKeys(view, listing)
    .filter((field) =>
      isFieldListedInFilterPanel(resolveFieldListing(getFieldDefinition(field), listing))
    )
    .map((field) => columnKeyToFilter(field, listing));
};

export const makeTypeDefaultActiveColumns = (listing: TDefaultListingContext) => {
  return collectDefaultActiveColumns(getViewDefinitionByExtendedType(listing.dataType), listing);
};

type TDataListStateSnapshot = {
  Sort: TSortStateList;
  Search: string;
  Page: number;
  Filters: Array<TCoreFilter>;
  View: TCircuitRepresentationView;
};

export const makeDataListStateSnapshotAtomsInitialValue = (
  listing: TDefaultListingContext
): TDataListStateSnapshot => ({
  Sort: [
    {
      field: EntityCoreFields.RegistrationDate,
      backendField: EntityCoreFields.RegistrationDate,
      order: SortOrder.DESC as TSortOrder,
    } satisfies TSortState,
  ],
  Search: '',
  Page: DEFAULT_PAGE_NUMBER,
  Filters: makeTypeDefaultFilters(listing),
  View: CircuitRepresentationView.Hierarchy,
});

type DataKeyParts = {
  virtualLabId?: string;
  projectId?: string;
  section?: TWorkspaceSection;
  dataType?: TExtendedEntitiesTypeDict;
  scope?: TWorkspaceScope;
  id?: string;
  extra?: string | null;
};

export const makeDataKey = ({
  virtualLabId,
  projectId,
  section,
  dataType,
  scope,
  id,
  extra,
}: Partial<
  Nullable<
    Omit<Required<DataKeyParts>, 'scope' | 'id' | 'extra'> & {
      scope?: TWorkspaceScope | null;
      id?: string | null;
      extra?: string | undefined | null;
    }
  >
>) => {
  const dataKey = compact([virtualLabId, projectId, section, dataType, scope, id, extra]).join('/');
  return { dataKey };
};

/**
 * safely extract parts from a dataKey created by makeDataKey().
 * returns undefined for parts that were omitted.
 */
export function extractPartsFromDataKey(dataKey: string): DataKeyParts {
  const parts = dataKey.split('/');
  const [virtualLabId, projectId, section, dataType, scope, id, extra] = [
    parts[0] ?? undefined,
    parts[1] ?? undefined,
    parts[2] ?? undefined,
    parts[3] ?? undefined,
    parts[4] ?? undefined,
    parts[5] ?? undefined,
    parts[6] ?? undefined,
  ];

  return {
    virtualLabId,
    projectId,
    section: section as TWorkspaceSection | undefined,
    dataType: dataType as TExtendedEntitiesTypeDict | undefined,
    scope: scope as TWorkspaceScope | undefined,
    id,
    extra,
  };
}
