'use client';

import { get as _get, compact } from 'es-toolkit/compat';
import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import { DEFAULT_PAGE_NUMBER } from '@/constants';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import {
  SortOrder,
  type TCoreFilter,
  type TSortOrder,
  type TSortState,
} from '@/entity-configuration/definitions/types';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { columnKeyToFilter } from '@/ui/segments/data-table/elements/column-key-to-filter';
import {
  CircuitRepresentationView,
  type TCircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';

export const makeTypeDefaultFilters = ({ dataType }: { dataType: TExtendedEntitiesTypeDict }) => {
  const columns = getViewDefinitionByExtendedType(dataType)?.columns;
  const fields = columns ? getFieldsDefinition(columns) : [];
  const filteredColumns = [
    ...(columns
      ?.filter(
        (o) =>
          _get(fields, o, { isFilterable: false })?.isFilterable === true ||
          _get(fields, o, { isDisplayable: false })?.isDisplayable === true
      )
      ?.map((colKey) => columnKeyToFilter(colKey, dataType)) ?? []),
  ];
  return filteredColumns;
};

type DataListStateSnapshot = {
  Sort: TSortState;
  Search: string;
  Page: number;
  Filters: TCoreFilter[];
  View: TCircuitRepresentationView;
};

export const makeDataListStateSnapshotAtomsInitialValue = ({
  dataType,
}: {
  dataType: TExtendedEntitiesTypeDict;
}): DataListStateSnapshot => ({
  Sort: {
    field: EntityCoreFields.RegistrationDate,
    backendField: EntityCoreFields.RegistrationDate,
    order: SortOrder.DESC as TSortOrder,
  },
  Search: '',
  Page: DEFAULT_PAGE_NUMBER,
  Filters: makeTypeDefaultFilters({ dataType }),
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
}: Omit<Required<DataKeyParts>, 'scope' | 'id' | 'extra'> & {
  scope?: TWorkspaceScope | null;
  id?: string | null;
  extra?: string | undefined | null;
}) => {
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
