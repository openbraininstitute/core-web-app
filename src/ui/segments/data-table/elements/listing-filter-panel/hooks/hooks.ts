import { isNil } from 'es-toolkit/compat';
import React from 'react';

import { getFieldDefinition } from '@/entity-configuration/definitions';
import { fieldTitleSentenceCase } from '@/util/utils';

import { createFilterItemComponent } from './create-filter-item-component';

import type { TFacets } from '@/api/entitycore/types/shared/response';
import type { CoreFilterValues, TCoreFilter } from '@/entity-configuration/definitions/types';
import type { ViewDefinitionConfig } from '@/entity-configuration/definitions/view-defs/types';

export function useFilterItems(
  filters: TCoreFilter[],
  entity: ViewDefinitionConfig | null,
  facets: TFacets | undefined,
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
              (entity?.filterableFields ? entity?.filterableFields.includes(filter.field) : true)
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
      entity,
    ]
  );
}
