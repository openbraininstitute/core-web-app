import React from 'react';
import { isNil } from 'es-toolkit/compat';

import { createFilterItemComponent } from './create-filter-item-component';

import { Facets } from '@/api/entitycore/types/shared/response';
import { CoreFilter, CoreFilterValues } from '@/entity-configuration/definitions/types';
import { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { fieldTitleSentenceCase } from '@/util/utils';

export function useFilterItems(
  filters: CoreFilter[],
  Entity: ViewDefinitionConfig | null,
  facets: Facets | undefined,
  filterValues: CoreFilterValues,
  setFilterValues: React.Dispatch<React.SetStateAction<CoreFilterValues>>,
  activeColumns: string[] | undefined,
  showDisplayTrigger: boolean,
  onToggleActive: (key: string) => void
) {
  return React.useMemo(
    () =>
      filters
        .filter((o) => o.field !== 'id')
        ?.map((filter) => {
          const item = getFieldDefinition(filter.field);
          return {
            content:
              filter.type &&
              item?.isFilterable &&
              (Entity?.filterableFields ? Entity?.filterableFields.includes(filter.field) : true)
                ? createFilterItemComponent(
                    filter,
                    facets,
                    filterValues,
                    setFilterValues,
                    item.filterData
                  )
                : undefined,
            display: item?.isDisplayable && activeColumns?.includes(filter.field),
            label: fieldTitleSentenceCase(item?.title ?? ''),
            type: filter.type,
            toggleFunc: showDisplayTrigger
              ? () => onToggleActive && onToggleActive(filter.field)
              : undefined, // There are cases where we don't want to show the display trigger. Undefined toggleFunc achieves this.
          };
        })
        .filter((item) => showDisplayTrigger || !isNil(item.content)), // If showDisplayTrigger is false and content is undefined that filter is not needed.
    [
      filters,
      facets,
      filterValues,
      setFilterValues,
      activeColumns,
      showDisplayTrigger,
      onToggleActive,
      Entity,
    ]
  );
}
