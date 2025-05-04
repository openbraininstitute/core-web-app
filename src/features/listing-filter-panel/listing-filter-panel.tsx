/* eslint-disable no-case-declarations */

import {
  ChangeEvent,
  Dispatch,
  ReactNode,
  SetStateAction,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { CloseOutlined } from '@ant-design/icons';
import { unwrap, useResetAtom } from 'jotai/utils';
import { useAtom, useSetAtom } from 'jotai';
import { Input } from 'antd';

import orderBy from 'lodash/orderBy';
import map from 'lodash/map';
import get from 'lodash/get';

import ValueOrRange from '@/features/listing-filter-panel/value-or-range';
import ClearFilters from '@/features/listing-filter-panel/clear-filters';
import DateRange from '@/features/listing-filter-panel/date-range';
import CheckList from '@/features/listing-filter-panel/checklist';

import {
  activeColumnsAtom,
  filtersAtom,
  pageNumberAtom,
  previousDataAtom,
  searchStringAtom,
} from '@/state/explore-section/list-view-atoms';
import { Filter, GteLteValue, ValueOrRangeFilter } from '@/features/listing-filter-panel/types';
import { getFieldDefinition, getFieldsDefinition } from '@/entity-configuration/definitions';
import { ExploreDataScope, FilterValues } from '@/types/explore-section/application';
import { FilterGroup } from '@/features/listing-filter-panel/filter-group';
import { DataType, PAGE_NUMBER } from '@/constants/explore-section/list-views';
import { Facets } from '@/api/entitycore/types/shared/response';
import { defaultList } from './checklist/default-checklist';
import { fieldTitleSentenceCase } from '@/util/utils';
import {
  CoreFieldFilterTypeEnum,
  EntityCoreFields,
} from '@/entity-configuration/definitions/fields-defs/enums';

import type { CoreFilter } from '@/entity-configuration/definitions/types';
import type { WorkspaceContext } from '@/types/common';

export type Props = {
  children?: ReactNode;
  toggleDisplay: () => void;
  dataType: DataType;
  dataScope?: ExploreDataScope;
  dataKey: string;
  filters: CoreFilter[];
  facets: Facets | undefined;
  setFilters: any;
  showDisplayTrigger?: boolean;
  resourceId?: string;
  virtualLabInfo?: WorkspaceContext;
};

function createFilterItemComponent(
  filter: CoreFilter,
  facets: Facets | undefined,
  filterValues: FilterValues,
  setFilterValues: Dispatch<SetStateAction<FilterValues>>
) {
  return function FilterItemComponent() {
    const { type } = filter;

    const updateFilterValues = (field: string, values: Filter['value']) => {
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
        if (!facets) return emptyFilter;

        // if (esConfig?.nested) {
        //   const nestedAgg = facets[filter.field] as NestedStatsAggregation;
        //   facet = nestedAgg[filter.field][esConfig?.nested.aggregationName];
        // } else {
        //   facet = facets[filter.field] as Statistics;
        // }

        // return (
        //   <ValueRange
        //     filter={filter}
        //     aggregation={facet}
        //     onChange={(values: GteLteValue) => updateFilterValues(filter.field, values)}
        //   />
        // );
        return null;

      case CoreFieldFilterTypeEnum.CheckList:
        if (!facets || !facets[filter.field]) return emptyFilter;
        const facetItems = map(facets[filter.field], ({ id, label, count, type }) => ({
          id,
          label,
          type,
          count,
          value: label,
        }));
        return (
          <CheckList
            data={facetItems}
            filter={filter}
            values={(filterValues[filter.field] as string[]) ?? []}
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

export default function ListingFilterPanel({
  children,
  toggleDisplay,
  dataType,
  dataScope,
  dataKey,
  filters,
  setFilters,
  facets,
  showDisplayTrigger = true,
  resourceId,
  virtualLabInfo,
}: Props) {
  const [filterValues, setFilterValues] = useState<FilterValues>({});
  const resetFilters = useResetAtom(filtersAtom({ dataType, dataScope, resourceId, key: dataKey }));
  const setSearchString = useSetAtom(searchStringAtom(dataKey));
  const setPrevData = useSetAtom(
    previousDataAtom({ virtualLabInfo, dataType, dataScope, key: dataKey })
  );
  const setPageNumber = useSetAtom(pageNumberAtom(dataKey));
  const [activeColumns, setActiveColumns] = useAtom(
    useMemo(
      () => unwrap(activeColumnsAtom({ dataType, dataScope, key: dataKey })),
      [dataType, dataScope, dataKey]
    )
  );
  const fields = activeColumns ? getFieldsDefinition(activeColumns as EntityCoreFields[]) : [];

  console.log('ᦨ #  listing-filter-panel.tsx:197 #  activeColumns:', activeColumns);

  const onToggleActive = (key: string) => {
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
  };

  useEffect(() => {
    const values: FilterValues = {};

    filters?.forEach((filter: CoreFilter) => {
      values[filter.field] = filter.value;
    });

    setFilterValues(values);
  }, [filters]);

  const submitValues = () => {
    setPageNumber(PAGE_NUMBER);
    setPrevData([]);
    setFilters(filters?.map((fil: CoreFilter) => ({ ...fil, value: filterValues[fil.field] })));
  };

  if (!activeColumns) return null;

  const activeColumnsLength = activeColumns.length ? activeColumns.length - 1 : 0;
  const activeColumnsText = `${activeColumnsLength} active ${
    activeColumnsLength === 1 ? 'column' : 'columns'
  }`;

  const filterItems = useMemo(
    () =>
      filters
        ?.map((filter) => {
          const item = getFieldDefinition(filter.field);
          return {
            content:
              filter.type && item?.isFilterable
                ? createFilterItemComponent(filter, facets, filterValues, setFilterValues)
                : undefined,
            display: item?.isDisplayable && activeColumns.includes(filter.field),
            label: fieldTitleSentenceCase(item?.title ?? ''),
            type: filter.type,
            toggleFunc: showDisplayTrigger
              ? () => onToggleActive && onToggleActive(filter.field)
              : undefined, // There are cases where we don't want to show the display trigger. Undefined toggleFunc achieves this.
          };
        })
        .filter((item) => showDisplayTrigger || item.content !== undefined), // If showDisplayTrigger is false and content is undefined that filter is not needed.
    [
      filters,
      facets,
      filterValues,
      setFilterValues,
      activeColumns,
      showDisplayTrigger,
      onToggleActive,
    ]
  );

  // The columnKeyToFilter method receives a string (key)
  // and in this case it is the equivalent to a filters[x].field
  const clearFilters = () => {
    resetFilters();
    setSearchString('');
  };

  return (
    <div
      data-testid="listing-view-filter-panel"
      className="bg-primary-8 fixed top-0 right-0 z-10 flex h-full min-h-screen w-[480px] shrink-0 flex-col space-y-4 overflow-y-auto px-8 pt-6"
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
          type="submit"
          onClick={submitValues}
          className="bg-primary-2 text-primary-9 px-8 py-3"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
