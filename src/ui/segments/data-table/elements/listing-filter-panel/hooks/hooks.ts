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
  IFilterOptionItem,
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
  const [optionsByField, setOptionsByField] = React.useState<
    Record<string, IFilterOptionItem[] | undefined>
  >({});

  React.useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      const entries = await Promise.all(
        filters.map(async (filter) => {
          const item = getFieldDefinition(filter.field);
          const { optionsSource } = resolveFieldListing(item, context);
          const options = await resolveFilterOptions(optionsSource, context, workspace);
          return [filter.field, options] as const;
        })
      );

      if (!cancelled) {
        setOptionsByField(Object.fromEntries(entries));
      }
    };

    void loadOptions();

    return () => {
      cancelled = true;
    };
  }, [filters, context, workspace]);

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
