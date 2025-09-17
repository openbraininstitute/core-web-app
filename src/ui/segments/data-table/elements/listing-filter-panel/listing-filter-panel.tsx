/* eslint-disable no-case-declarations */

import {
  ChangeEvent,
  Dispatch,
  ReactNode,
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { unwrap, useResetAtom } from 'jotai/utils';
import { useHotkeys } from 'react-hotkeys-hook';
import { useAtom, useSetAtom } from 'jotai';
import { Input } from 'antd';

import isNil from 'lodash/isNil';
import map from 'lodash/map';

import ValueOrRange from '@/ui/segments/data-table/elements/listing-filter-panel/value-or-range';
import ClearFilters from '@/ui/segments/data-table/elements/listing-filter-panel/clear-filters';
import DateRange from '@/ui/segments/data-table/elements/listing-filter-panel/date-range';
import CheckList from '@/ui/segments/data-table/elements/listing-filter-panel/checklist';

import { defaultList } from '@/ui/segments/data-table/elements/listing-filter-panel/checklist/default-checklist';
import { DropdownList } from '@/ui/segments/data-table/elements/listing-filter-panel/filter-as-dropdown';
import { FilterGroup } from '@/ui/segments/data-table/elements/listing-filter-panel/filter-group';
import { ValueRange } from '@/ui/segments/data-table/elements/listing-filter-panel/value-range';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { getFieldDefinition } from '@/entity-configuration/definitions';
import { fieldTitleSentenceCase } from '@/util/utils';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
} from '@/ui/segments/data-table/elements/context';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { Facets } from '@/api/entitycore/types/shared/response';
import type { WorkspaceContext } from '@/types/common';
import { DEFAULT_PAGE_NUMBER, type TWorkspaceScope } from '@/constants';
import type {
  ValueOrRangeFilter,
  CoreFilterValues,
  GteLteValue,
  CoreFilter,
} from '@/entity-configuration/definitions/types';
import { cn } from '@/utils/css-class';

type Props = {
  children?: ReactNode;
  toggleDisplay: () => void;
  dataType: TExtendedEntitiesTypeDict;
  // eslint-disable-next-line react/no-unused-prop-types
  dataScope?: TWorkspaceScope;
  dataKey: string;
  filters: CoreFilter[];
  facets: Facets | undefined;
  setFilters: any;
  showDisplayTrigger?: boolean;
  // eslint-disable-next-line react/no-unused-prop-types
  workspace?: WorkspaceContext;
  isLoading?: boolean;
};

function createFilterItemComponent(
  filter: CoreFilter,
  facets: Facets | undefined,
  filterValues: CoreFilterValues,
  setFilterValues: Dispatch<SetStateAction<CoreFilterValues>>,
  items?: Array<{ value: string; label: string }> | undefined
) {
  return function FilterItemComponent() {
    const { type } = filter;

    const updateFilterValues = (field: string, values: CoreFilter['value']) => {
      setFilterValues((prevState) => ({
        ...prevState,
        [field]: values,
      }));
    };

    const emptyFilter = (
      <div className="pl-9 font-light text-white italic">
        No filter available for this property yet
      </div>
    );

    switch (type) {
      case CoreFieldFilterTypeEnum.DateRange:
        return (
          <DateRange
            filter={filter}
            onChange={(values: GteLteValue) => updateFilterValues(filter.field, values)}
          />
        );

      case CoreFieldFilterTypeEnum.ValueRange:
        return (
          <ValueRange
            filter={filter}
            onChange={(values: GteLteValue) => updateFilterValues(filter.field, values)}
          />
        );

      case CoreFieldFilterTypeEnum.DropdownList:
        if (!items?.length) return emptyFilter;
        return (
          <DropdownList
            filter={filter}
            data={items}
            onChange={(values: string[]) => updateFilterValues(filter.field, values)}
            allowMultiple
          />
        );
      case CoreFieldFilterTypeEnum.CheckList:
        if (!facets || !facets[filter.field]) return emptyFilter;
        const facetItems = map(facets[filter.field], ({ id, label, count, type: facetType }) => ({
          id,
          label,
          type: facetType,
          count,
          value: label,
        }));

        return (
          <CheckList
            data={facetItems}
            filter={filter}
            values={(filterValues[filter.field] as Array<string>) ?? []}
            onChange={(values: string[]) => updateFilterValues(filter.field, values)}
          >
            {defaultList}
          </CheckList>
        );

      case CoreFieldFilterTypeEnum.ValueOrRange:
        return (
          <ValueOrRange
            filter={filter}
            setFilter={(value: ValueOrRangeFilter['value']) =>
              updateFilterValues(filter.field, value)
            }
          />
        );

      case CoreFieldFilterTypeEnum.Text:
        return (
          <div className="flex flex-col gap-2">
            <Input
              value={filterValues[filter.field] as string}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                updateFilterValues(filter.field, event.target.value)
              }
            />
            <span className="text-white">
              Use the asterix character (<code className="text-semibold font-mono">*</code>) to
              specify a &quot;wildcard&quot; for your search. For example; to search for names{' '}
              <i>beginning with</i> &quot;AA11&quot;, specify{' '}
              <code className="text-semibold font-mono">AA11*</code>. To search for names{' '}
              <i>containing</i> &quot;L5-2&quot;, specify{' '}
              <code className="text-bold font-mono">*L5-2*</code>.
            </span>
          </div>
        );

      default:
        return null;
    }
  };
}

export function ListingFilterPanel({
  children,
  toggleDisplay,
  dataType,
  dataKey,
  filters,
  setFilters,
  facets,
  showDisplayTrigger = true,
  isLoading,
}: Props) {
  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [filterValues, setFilterValues] = useState<CoreFilterValues>({});
  const resetFilters = useResetAtom(
    coreFiltersAtom({
      dataType,
      key: dataKey,
    })
  );
  const setSearchString = useSetAtom(coreSearchStringAtom(dataKey));
  useHotkeys('Escape', toggleDisplay);

  const [activeColumns, setActiveColumns] = useAtom(
    useMemo(
      () =>
        unwrap(
          coreActiveColumnsAtom({
            dataType,
            key: dataKey,
          })
        ),
      [dataType, dataKey]
    )
  );

  const onToggleActive = useCallback(
    (key: string) => {
      if (!activeColumns) return;
      const existingIndex = activeColumns.findIndex((existingKey) => existingKey === key);

      if (existingIndex === -1) {
        setActiveColumns([...activeColumns, key]);
      } else {
        setActiveColumns([
          ...activeColumns.slice(0, existingIndex),
          ...activeColumns.slice(existingIndex + 1),
        ]);
      }
    },

    [activeColumns, setActiveColumns]
  );

  useEffect(() => {
    const values: CoreFilterValues = {};

    filters?.forEach((filter: CoreFilter) => {
      values[filter.field] = filter.value;
    });

    setFilterValues(values);
  }, [filters]);

  const submitValues = () => {
    setPageNumber(DEFAULT_PAGE_NUMBER);
    const appliedFilters = filters?.map((fil: CoreFilter) => ({
      ...fil,
      value: filterValues[fil.field],
    }));
    setFilters(appliedFilters);
  };

  const Entity = getViewDefinitionByExtendedType(dataType);
  const filterItems = useMemo(
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

  if (!activeColumns) return null;

  const activeColumnsLength = activeColumns.length ? activeColumns.length - 1 : 0;
  const activeColumnsText = `${activeColumnsLength} active ${
    activeColumnsLength === 1 ? 'column' : 'columns'
  }`;

  // The columnKeyToFilter method receives a string (key)
  // and in this case it is the equivalent to a filters[x].field
  const clearFilters = () => {
    resetFilters();
    setSearchString('');
  };

  return (
    <div className="relative w-full">
      <div // eslint-disable-line jsx-a11y/click-events-have-key-events
        role="button"
        tabIndex={0}
        aria-label="Close download panel mask"
        onClick={toggleDisplay}
        className={cn(
          'fixed top-0 left-0 z-50 h-screen w-screen bg-black opacity-50 transition-opacity duration-500'
        )}
      />
      <div
        id="main-table-filter-panel"
        data-testid="listing-view-filter-panel"
        className="bg-primary-8 fixed top-0 right-0 z-100 flex h-full min-h-screen w-1/3 shrink-0 flex-col space-y-4 overflow-y-auto px-8 pt-6"
      >
        <div className="mb-auto">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="flex items-baseline gap-2 text-2xl font-bold text-white">
              Filters
              <small className="text-primary-3 text-base font-light">{activeColumnsText}</small>
            </span>
            <button
              autoFocus // eslint-disable-line jsx-a11y/no-autofocus
              type="button"
              onClick={toggleDisplay}
              className="hover:bg-neutral-1/10 rounded-md px-2 py-1 text-white"
              aria-label="Close"
            >
              <CloseOutlined />
            </button>
          </div>

          <p className="pr-4 text-white">
            Use the eye icon to hide/show columns. Select the column titles and tick the checkbox of
            the option(s).
          </p>

          <div className="flex flex-col gap-12">
            <FilterGroup items={filterItems} filters={filters} setFilters={setFilters} />
            {children}
          </div>
        </div>

        <div className="bg-primary-8 sticky bottom-0 left-0 mt-auto flex w-full items-center justify-between py-6">
          <ClearFilters onClick={clearFilters} />
          <button
            type="button"
            onClick={submitValues}
            className="bg-primary-2 text-primary-9 flex items-center justify-center gap-1.5 px-8 py-3"
          >
            <div>Apply</div>
            {isLoading && filters.length > 0 && <LoadingOutlined />}
          </button>
        </div>
      </div>
    </div>
  );
}
