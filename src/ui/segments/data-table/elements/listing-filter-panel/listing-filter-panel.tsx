import { CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { useIsFetching } from '@tanstack/react-query';
import { Spin } from 'antd';
import { get } from 'es-toolkit/compat';
import { useAtom, useSetAtom } from 'jotai';
import { unwrap, useResetAtom } from 'jotai/utils';
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';

import { DEFAULT_PAGE_NUMBER, type TWorkspaceScope, type TWorkspaceSection } from '@/constants';
import { getViewDefinitionByExtendedType } from '@/entity-configuration/definitions/view-defs';
import { getEntityByExtendedType } from '@/entity-configuration/domain/helpers';
import { Button } from '@/ui/molecules/button';
import {
  coreActiveColumnsAtom,
  coreFiltersAtom,
  corePageNumberAtom,
  coreSearchStringAtom,
  useDataListStateSnapshotActions,
} from '@/ui/segments/data-table/elements/context';
import { makeTypeDefaultFilters } from '@/ui/segments/data-table/elements/helpers';
import { ClearFilters } from '@/ui/segments/data-table/elements/listing-filter-panel/clear-filters';
import { FilterGroup } from '@/ui/segments/data-table/elements/listing-filter-panel/filter-group';
import { useFilterItems } from '@/ui/segments/data-table/elements/listing-filter-panel/hooks';
import { cn } from '@/utils/css-class';

import type { TExtendedEntitiesTypeDict } from '@/api/entitycore/types/extended-entity-type';
import type { TFacets } from '@/api/entitycore/types/shared/response';
import type { CoreFilterValues, TCoreFilter } from '@/entity-configuration/definitions/types';
import type { WorkspaceContext } from '@/types/common';

type Props = {
  children?: ReactNode;
  toggleDisplay: () => void;
  dataType: TExtendedEntitiesTypeDict;
  dataScope?: TWorkspaceScope;
  dataKey: string;
  filters: TCoreFilter[];
  setFilters: any;
  showDisplayTrigger?: boolean;
  workspace?: WorkspaceContext;
  classNames?: {
    container?: string;
  };
  section?: TWorkspaceSection;
  facets?:
    | {
        data: TFacets | undefined;
        loading: boolean;
        error: Error | null;
      }
    | undefined;
};

export function ListingFilterPanel({
  children,
  toggleDisplay,
  dataType,
  dataKey,
  filters,
  setFilters,
  showDisplayTrigger = true,
  classNames,
  section,
  facets,
}: Props) {
  useHotkeys('Escape', toggleDisplay);

  const setPageNumber = useSetAtom(corePageNumberAtom(dataKey));
  const [filterValues, setFilterValues] = useState<CoreFilterValues>({});
  const [isApplyingFilters, setIsApplyingFilters] = useState(false);
  const resetFilters = useResetAtom(
    coreFiltersAtom({
      dataType,
      key: dataKey,
    })
  );
  const entityViewDefs = getViewDefinitionByExtendedType(dataType);
  const entityConfig = getEntityByExtendedType({ type: dataType });

  const { sync: runStorageSync } = useDataListStateSnapshotActions({
    dataKey,
    dataType,
    section,
  });
  const setSearchString = useSetAtom(coreSearchStringAtom(dataKey));
  const isFetchingCount = useIsFetching({
    predicate: (query) => {
      const fullQueryKey = query.queryKey.at(0);
      const key = get(fullQueryKey, 'context.key', '');
      return key === dataKey;
    },
    fetchStatus: 'fetching',
  });

  const isFetching = isFetchingCount > 0;

  const prevIsFetchingRef = useRef(isFetching);

  useEffect(() => {
    if (prevIsFetchingRef.current && !isFetching && isApplyingFilters) {
      setIsApplyingFilters(false);
    }
    prevIsFetchingRef.current = isFetching;
  }, [isFetching, isApplyingFilters]);

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
      const existingIndex = activeColumns.indexOf(key);

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

    filters?.forEach((filter: TCoreFilter) => {
      values[filter.field] = filter.value;
    });

    setFilterValues(values);
  }, [filters]);

  const submitValues = () => {
    setIsApplyingFilters(true);
    setPageNumber(DEFAULT_PAGE_NUMBER);
    const appliedFilters = filters?.map((fil: TCoreFilter) => ({
      ...fil,
      value: filterValues[fil.field],
    }));
    setFilters(appliedFilters);
    runStorageSync({
      Filters: appliedFilters as Array<TCoreFilter>,
      Page: DEFAULT_PAGE_NUMBER,
    });
    setIsApplyingFilters(false);
  };

  const filterItems = useFilterItems(
    filters,
    entityViewDefs,
    facets?.data,
    filterValues,
    setFilterValues,
    activeColumns,
    showDisplayTrigger,
    onToggleActive,
    dataType,
    section
  );

  // The columnKeyToFilter method receives a string (key)
  // and in this case it is the equivalent to a filters[x].field
  const clearFilters = () => {
    resetFilters();
    setSearchString('');
    runStorageSync({
      Filters: makeTypeDefaultFilters({ dataType }),
      Search: '',
    });
  };

  if (!activeColumns) return null;

  const activeColumnsLength = activeColumns.length ? activeColumns.length - 1 : 0;
  const activeColumnsText = `${activeColumnsLength} active ${
    activeColumnsLength === 1 ? 'column' : 'columns'
  }`;

  return (
    <div className="relative w-full">
      {/** biome-ignore lint/a11y/useSemanticElements: can't be button */}
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: can't be button */}
      <div
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
        className={cn(
          'bg-primary-8 fixed top-0 right-0 z-100 flex',
          'h-full min-h-screen w-1/3 shrink-0 flex-col space-y-4 overflow-y-auto px-8 pt-6',
          classNames?.container
        )}
      >
        <div className="mb-auto flex-1 flex flex-col relative">
          <div className="mb-2 flex items-center justify-between gap-4">
            <span className="flex items-baseline gap-2 text-2xl font-bold text-white">
              Filters
              <small className="text-primary-3 text-base font-light">{activeColumnsText}</small>
            </span>
            <button
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

          {facets?.error ? (
            <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 text-center text-white">
              <span className="text-lg font-semibold">Unable to load filters</span>
              <p className="text-primary-3 text-sm">
                Something went wrong while fetching filter options for "
                {entityConfig?.title.toLowerCase()}" entities.
                <br />
                Please try again later or contact support if the issue persists.
              </p>
            </div>
          ) : facets?.loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Spin indicator={<LoadingOutlined className="text-white size-10" />} />
            </div>
          ) : (
            <div className="flex flex-col gap-12">
              <FilterGroup items={filterItems} filters={filters} setFilters={setFilters} />
              {children}
            </div>
          )}
        </div>

        <div className="bg-primary-8 sticky bottom-0 left-0 mt-auto flex w-full items-center justify-between py-6">
          <ClearFilters onClick={clearFilters} disabled={!!facets?.loading} />
          <Button
            type="button"
            disabled={facets?.loading}
            onClick={submitValues}
            variant="default"
            className="bg-primary-2 text-primary-9 hover:bg-primary-2/80 flex items-center justify-center gap-1.5 rounded-none px-10 md:h-10 lg:h-12"
          >
            <span className="text-base font-semibold">Apply</span>
            {/* <LoadingOutlined
              className={cn("text-black/80", {
                hidden: !isApplyingFilters && !isFetching,
              })}
            /> */}
          </Button>
        </div>
      </div>
    </div>
  );
}
