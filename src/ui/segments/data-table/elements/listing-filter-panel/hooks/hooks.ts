import { useQueries } from '@tanstack/react-query';
import { isNil } from 'es-toolkit/compat';
import React from 'react';

import { getFieldDefinition } from '@/entity-configuration/definitions';
import {
  resolveFieldListing,
  resolveFilterOptions,
} from '@/entity-configuration/definitions/listing';
import { fieldTitleSentenceCase } from '@/util/utils';

import { createFilterItemComponent } from './create-filter-item-component';

import type { TFacets } from '@/api/entitycore/types/shared/response';
import type {
  CoreFilterValues,
  TCoreFilter,
  TFieldApiContext,
} from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import type { WorkspaceContext } from '@/types/common';

export function useFilterItems(
  filters: TCoreFilter[],
  _entity: ViewDefinitionConfig | null,
  facets: TFacets | undefined,
  filterValues: CoreFilterValues,
  setFilterValues: React.Dispatch<React.SetStateAction<CoreFilterValues>>,
  activeColumns: string[] | undefined,
  showDisplayTrigger: boolean,
  onToggleActive: (key: string) => void,
  context: TFieldApiContext,
  workspace?: WorkspaceContext
) {
  const optionsByField = useQueries({
    queries: filters.map((filter) => ({
      queryKey: ['filter-options', filter.field, context, workspace] as const,
      queryFn: async () => {
        const item = getFieldDefinition(filter.field);
        const { optionsSource } = resolveFieldListing(item, context);
        return resolveFilterOptions(optionsSource, context, workspace);
      },
    })),
    combine: (results) =>
      Object.fromEntries(filters.map((filter, i) => [filter.field, results[i].data])),
  });

  return React.useMemo(
    () =>
      filters
        .filter((o) => o.field !== 'id')
        ?.map((filter) => {
          const item = getFieldDefinition(filter.field);
          const presentation = resolveFieldListing(item, context);

          return {
            content:
              filter.type && presentation.filterAvailable
                ? createFilterItemComponent(
                    filter,
                    facets,
                    filterValues,
                    setFilterValues,
                    optionsByField[filter.field]
                  )
                : undefined,
            display: presentation.columnAvailable && activeColumns?.includes(filter.field),
            label: fieldTitleSentenceCase(item?.title ?? ''),
            type: filter.type,
            toggleFunc:
              showDisplayTrigger && presentation.columnAvailable
                ? () => onToggleActive?.(filter.field)
                : undefined, // There are cases where we don't want to show the display trigger. Undefined toggleFunc achieves this.
          };
        })
        .filter(
          (item) =>
            (showDisplayTrigger && (!isNil(item.content) || !isNil(item.toggleFunc))) ||
            (!showDisplayTrigger && !isNil(item.content))
        ),
    [
      filters,
      facets,
      filterValues,
      setFilterValues,
      activeColumns,
      showDisplayTrigger,
      onToggleActive,
      context,
      optionsByField,
    ]
  );
}
