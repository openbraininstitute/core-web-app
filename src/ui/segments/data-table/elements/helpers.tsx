'use client';

import { get as _get, compact } from 'es-toolkit/compat';

import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { columnKeyToFilter } from '@/ui/segments/data-table/elements/column-key-to-filter';
import { EntityCoreFields } from '@/entity-configuration/definitions/fields-defs/enums';
import { getFieldsDefinition } from '@/entity-configuration/definitions';
import {
  CircuitRepresentationView,
  type TCircuitRepresentationView,
} from '@/ui/segments/explore/circuit/helpers';
import { useSessionStorage } from '@/hooks/use-session-storage';
import { DEFAULT_PAGE_NUMBER } from '@/constants';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { CoreFilter } from '@/entity-configuration/definitions/types';
import type { TWorkspaceScope, TWorkspaceSection } from '@/constants';
import type { TSortOrder } from '@/types/explore-section/application';

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

export const makeDataListStoreAtomsInitialValue = ({
  dataType,
}: {
  dataType: TExtendedEntitiesTypeDict;
}) => ({
  Sort: {
    field: EntityCoreFields.CreationDate,
    backendField: EntityCoreFields.CreationDate,
    order: 'desc' as const,
  },
  Search: '',
  Page: DEFAULT_PAGE_NUMBER,
  Filters: makeTypeDefaultFilters({ dataType }),
  View: CircuitRepresentationView.Hierarchy,
});

export function useDataListStoreSession({
  dataKey,
  dataType,
}: {
  dataKey: string;
  dataType: TExtendedEntitiesTypeDict;
}) {
  return useSessionStorage<{
    Sort: {
      field: EntityCoreFields;
      backendField: EntityCoreFields;
      order: TSortOrder;
    };
    Search: string;
    Page: number;
    Filters: Array<CoreFilter>;
    View: TCircuitRepresentationView;
  }>(dataKey, makeDataListStoreAtomsInitialValue({ dataType }));
}

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
  return compact([virtualLabId, projectId, section, dataType, scope, id, extra]).join('/');
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
