import { Table } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { Key, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircuitSchemaProps, FilteredCircuit } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import collectExpandableKeys from '../utils/collectExpandableKeys';
import { flattenCircuits } from '../utils/flatten-circuits';
import columns from './Columns';
import DownloadContainer from './download/download-container';
import FilterButton from './filters/filter-button';
import SearchBar from './search-bar';
import { columnsAtom, filtersAtom, setFilterAtom } from './state/columns';
import SubcircuitTable from './subcircuit-table';
import TableScrollButton from './table-scroll-button';
import ViewToggle from './ViewToggle';

import { DataType } from '@/constants/explore-section/list-views';
import { CoreFieldFilterTypeEnum } from '@/entity-configuration/definitions/fields-defs/enums';
import { CoreFilter, GteLteValue } from '@/entity-configuration/definitions/types';

import ListingFilterPanel from '@/features/listing-filter-panel/listing-filter-panel';
import { classNames } from '@/util/utils';
import styles from './exploreCircuitTable.module.scss';

export default function CircuitTable({
  data,
  hasSearch = true,
}: {
  data: CircuitSchemaProps[];
  hasSearch?: boolean;
}) {
  const [circuitToDownload, setCircuitToDownload] = useState<CircuitSchemaProps | null>(null);
  const [downloadModalOpen, setDownloadModalOpen] = useState<boolean>(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [filterPanelActive, setFilterPanelActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setFilter] = useAtom(setFilterAtom);
  const [toggle, setToggle] = useState<'hierarchical' | 'flat'>('hierarchical');
  const [isAtStart, setIsAtStart] = useState<boolean>(true);
  const [isAtEnd, setIsAtEnd] = useState<boolean>(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [coreFilters, setCoreFilters] = useState<CoreFilter[]>([]);

  const updateScrollPosition = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setIsAtStart(scrollLeft === 0);
      setIsAtEnd(scrollLeft + clientWidth >= scrollWidth - 1);
    }
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', updateScrollPosition);
      updateScrollPosition();
      return () => container.removeEventListener('scroll', updateScrollPosition);
    }
  }, [updateScrollPosition]);

  const scrollToStart = useCallback(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      updateScrollPosition();
    }
  }, [updateScrollPosition]);

  const scrollToEnd = useCallback(() => {
    if (scrollContainerRef.current) {
      const { scrollWidth, clientWidth } = scrollContainerRef.current;
      scrollContainerRef.current.scrollTo({
        left: scrollWidth - clientWidth,
        behavior: 'smooth',
      });
      updateScrollPosition();
    }
  }, [updateScrollPosition]);

  const columnState = useAtomValue(columnsAtom);
  const filters = useAtomValue(filtersAtom);

  const handleResetFilter = useCallback(() => {
    Object.keys(filters).forEach((columnId) => {
      setFilter({ columnId, filter: null });
    });
    setCoreFilters([]);
    setSearchQuery('');
  }, [filters, setFilter]);

  const handleOpenDownloadModal = useCallback((record: CircuitSchemaProps) => {
    setCircuitToDownload(record);
    setDownloadModalOpen(true);
  }, []);

  const handleCloseDownloadModal = useCallback(() => {
    setCircuitToDownload(null);
    setDownloadModalOpen(false);
  }, []);

  const pathname = usePathname();
  const isCircuitDetailPage = pathname.includes('/circuit/');

  const handleRowExpandClick = useCallback((row: CircuitSchemaProps) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  }, []);

  const cleanedData = useMemo(() => {
    const result = data.map((circuit: CircuitSchemaProps) => {
      const { numberOfNeurons } = circuit;
      if (typeof numberOfNeurons !== 'number' || Number.isNaN(numberOfNeurons)) {
        throw new Error(`Invalid numberOfNeurons for circuit ${circuit.key}`);
      }

      return {
        ...circuit,
        key: circuit.key || `circuit-${Math.random().toString(36).slice(2)}`,
        numberOfNeurons,
        name: circuit.name || 'Unknown',
        brainRegion: circuit.brainRegion || 'Unknown',
        scale: circuit.scale || 'Unknown',
        subcircuits: Array.isArray(circuit.subcircuits)
          ? circuit.subcircuits.map((sub) => ({
              ...sub,
              key: sub.key || `subcircuit-${Math.random().toString(36).slice(2)}`,
              numberOfNeurons:
                typeof sub.numberOfNeurons === 'number' && !Number.isNaN(sub.numberOfNeurons)
                  ? sub.numberOfNeurons
                  : 0,
              name: sub.name || 'Unknown',
              brainRegion: sub.brainRegion || 'Unknown',
              scale: sub.scale || 'Unknown',
              subcircuits: Array.isArray(sub.subcircuits) ? sub.subcircuits : [],
            }))
          : [],
      };
    });

    const flattened = flattenCircuits(result);
    return { hierarchical: result, flattened };
  }, [data]);

  // Synchronize Jotai filters with CoreFilter
  useEffect(() => {
    const newCoreFilters: CoreFilter[] = Object.entries(filters).map(([columnId, filter]) => {
      const column = columnState.find((col) => col.id === columnId);
      let filterType: CoreFieldFilterTypeEnum;
      let value: CoreFilter['value'] = filter;

      switch (column?.filterType) {
        case 'numeric':
          filterType = CoreFieldFilterTypeEnum.ValueRange;
          if (filter?.type === 'between') {
            value = { gte: filter.min, lte: filter.max };
          } else if (filter?.type === 'greaterThan') {
            value = { gte: filter.min };
          } else if (filter?.type === 'lessThan') {
            value = { lte: filter.max };
          }
          break;
        case 'text':
          filterType = CoreFieldFilterTypeEnum.Text;
          value = filter?.min || '';
          break;
        case 'select':
          filterType = CoreFieldFilterTypeEnum.CheckList;
          value = filter?.values || [];
          break;
        case 'date':
          filterType = CoreFieldFilterTypeEnum.DateRange;
          value = { gte: filter?.min, lte: filter?.min };
          break;
        case 'boolean':
          filterType = CoreFieldFilterTypeEnum.CheckList;
          value = filter?.min ? [filter.min] : [];
          break;
        default:
          filterType = CoreFieldFilterTypeEnum.Text;
          value = null;
      }

      return {
        field: columnId,
        type: filterType,
        value,
      };
    });

    setCoreFilters(newCoreFilters);
  }, [filters, columnState]);

  const handleSetCoreFilters = useCallback(
    (newFilters: CoreFilter[]) => {
      setCoreFilters(newFilters);

      newFilters.forEach((filter) => {
        const column = columnState.find((col) => col.id === filter.field);
        let jotaiFilter: any = null;

        switch (filter.type) {
          case CoreFieldFilterTypeEnum.ValueRange:
            const range = filter.value as GteLteValue;
            if (range.gte !== undefined && range.lte !== undefined) {
              jotaiFilter = { type: 'between', min: range.gte, max: range.lte };
            } else if (range.gte !== undefined) {
              jotaiFilter = { type: 'greaterThan', min: range.gte };
            } else if (range.lte !== undefined) {
              jotaiFilter = { type: 'lessThan', max: range.lte };
            }
            break;
          case CoreFieldFilterTypeEnum.Text:
            jotaiFilter = { min: filter.value || '' };
            break;
          case CoreFieldFilterTypeEnum.CheckList:
            jotaiFilter = { values: filter.value || [] };
            break;
          case CoreFieldFilterTypeEnum.DateRange:
            const dateRange = filter.value as GteLteValue;
            jotaiFilter = { min: dateRange.gte, max: dateRange.lte };
            break;
        }

        if (jotaiFilter) {
          setFilter({ columnId: filter.field, filter: jotaiFilter });
        }
      });
    },
    [columnState, setFilter]
  );

  const matchesFilters = useCallback(
    (circuit: CircuitSchemaProps) => {
      let matches = true;

      Object.entries(filters).forEach(([columnId, filter]) => {
        if (!filter) return;

        const column = columnState.find((col) => col.id === columnId);
        const filterType = column?.filterType;
        const value = circuit[columnId as keyof CircuitSchemaProps];

        let currentMatch = false;
        if (filterType === 'numeric' && typeof value === 'number' && filter.type) {
          const min = filter.min as number | undefined;
          const max = filter.max as number | undefined;
          if (filter.type === 'greaterThan' && min !== undefined) {
            currentMatch = value > min;
          } else if (filter.type === 'lessThan' && max !== undefined) {
            currentMatch = value < max;
          } else if (filter.type === 'between' && min !== undefined && max !== undefined) {
            currentMatch = value >= min && value <= max;
          }
        } else if (filterType === 'text' && typeof value === 'string' && filter.min) {
          currentMatch = value.toLowerCase().includes((filter.min as string).toLowerCase());
        } else if (filterType === 'select' && columnId === 'scale' && filter.values) {
          currentMatch = filter.values.includes(value as string);
        } else if (filterType === 'select' && filter.type) {
          currentMatch = value === filter.type;
        } else if (filterType === 'date' && typeof value === 'string' && filter.min) {
          currentMatch = moment(value).isSame(moment(filter.min as string), 'day');
        } else if (filterType === 'boolean' && filter.min) {
          currentMatch = value === (filter.min === 'true');
        }

        matches = matches && currentMatch;
      });

      if (searchQuery) {
        matches =
          matches &&
          ['name', 'brainRegion', 'scale', 'specie', 'publishedIn', 'buildCategory'].some(
            (field) => {
              const value = circuit[field as keyof CircuitSchemaProps];
              return (
                typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
              );
            }
          );
      }

      return matches;
    },
    [filters, searchQuery, columnState]
  );

  const hasMatchingSubcircuit = useCallback(
    (circuit: CircuitSchemaProps): boolean => {
      if (matchesFilters(circuit)) return true;
      if (!circuit.subcircuits || circuit.subcircuits.length === 0) return false;
      return circuit.subcircuits.some((sub) => hasMatchingSubcircuit(sub));
    },
    [matchesFilters]
  );

  const filteredData = useMemo(() => {
    let result: CircuitSchemaProps[] =
      toggle === 'hierarchical' ? cleanedData.hierarchical : cleanedData.flattened;

    result = result.filter((circuit) => {
      const circuitMatches = matchesFilters(circuit);
      const hasMatchingSub = toggle === 'hierarchical' && hasMatchingSubcircuit(circuit);
      return circuitMatches || hasMatchingSub;
    });

    if (toggle === 'hierarchical') {
      result = result.map((circuit) => ({
        ...circuit,
        isNonMatchingParent: !matchesFilters(circuit) && hasMatchingSubcircuit(circuit),
      }));
    }

    return result;
  }, [cleanedData, toggle, matchesFilters, hasMatchingSubcircuit]);

  const flattenedData = useMemo(() => {
    if (toggle === 'hierarchical') {
      return filteredData;
    }
    const keyCounts = filteredData.reduce(
      (acc, circuit) => {
        acc[circuit.key] = (acc[circuit.key] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    const duplicates = Object.entries(keyCounts).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      throw new Error(
        `Duplicate keys found in flattened data: ${duplicates
          .map(([key, count]) => `${key} (${count})`)
          .join(', ')}`
      );
    }
    return filteredData;
  }, [filteredData, toggle]);

  const tableData = useMemo(() => {
    return toggle === 'hierarchical' ? filteredData : flattenedData;
  }, [toggle, filteredData, flattenedData]);

  const activeColumns = useMemo(() => {
    return columnState.filter((col) => col.isActive).map((col) => col.id);
  }, [columnState]);

  const filteredColumns = useMemo(() => {
    const allColumns = columns(
      expandedRowKeys,
      (row: CircuitSchemaProps) =>
        calculateSubcircuitsForParent(row, matchesFilters, hasMatchingSubcircuit),
      handleRowExpandClick,
      isCircuitDetailPage,
      handleOpenDownloadModal,
      toggle,
      filters,
      searchQuery
    );
    const activeColumnIds = columnState.filter((col) => col.isActive).map((col) => col.id);
    const result = allColumns.filter((col) => activeColumnIds.includes(col.key as string));
    return toggle === 'flat' ? result.filter((col) => col.key !== 'subcircuits') : result;
  }, [
    toggle,
    expandedRowKeys,
    isCircuitDetailPage,
    handleOpenDownloadModal,
    handleRowExpandClick,
    columnState,
    filters,
    searchQuery,
    matchesFilters,
    hasMatchingSubcircuit,
  ]);

  useEffect(() => {
    const isFilterActive =
      Object.values(filters).some((f) => f !== null) || searchQuery.trim() !== '';
    if (toggle === 'hierarchical' && isFilterActive) {
      const expandableKeys = collectExpandableKeys(cleanedData.hierarchical);
      setExpandedRowKeys(expandableKeys);
    } else {
      setExpandedRowKeys([]);
    }
  }, [filters, searchQuery, cleanedData, toggle]);

  const handleExpandRow = useCallback((expanded: boolean, row: CircuitSchemaProps) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      expanded ? [...prev, rowKey] : prev.filter((key) => key !== rowKey)
    );
  }, []);

  const renderSubcircuits = useCallback(
    (circuit: CircuitSchemaProps) =>
      circuit.subcircuits && circuit.subcircuits.length > 0 ? (
        <SubcircuitTable
          columns={filteredColumns}
          circuit={circuit}
          expandedRowKeys={expandedRowKeys}
          onExpand={handleExpandRow}
          filters={filters}
          searchQuery={searchQuery}
          columnState={columnState}
        />
      ) : null,
    [expandedRowKeys, handleExpandRow, filteredColumns, filters, searchQuery, columnState]
  );

  const isFilterActive = useMemo(() => {
    return Object.values(filters).some((f) => f !== null);
  }, [filters]);

  return (
    <div className="relative flex w-full flex-col">
      {hasSearch && (
        <div className="relative mb-8 flex w-full flex-row justify-between px-8">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <div className="flex flex-row items-center gap-x-8">
            {isFilterActive && (
              <button
                className="mr-3 text-base text-gray-600 hover:text-gray-700"
                onClick={handleResetFilter}
                type="button"
                id="reset-filter"
                aria-label="Reset filter"
              >
                Reset filter
              </button>
            )}
            <FilterButton
              setActive={() => setFilterPanelActive(true)}
              numberOfFilters={Object.values(filters).filter((f) => f !== null).length}
              numberOfActiveColumns={columnState.filter((col) => col.isActive).length}
            />
            <ViewToggle toggle={toggle} setToggle={setToggle} />
          </div>
        </div>
      )}
      <div className="relative w-full overflow-x-scroll" ref={scrollContainerRef}>
        <div className="tableAndButton">
          {tableData.length === 0 ? (
            <div className="text-primary-9 text-center">No matching circuits found</div>
          ) : (
            <Table
              className={styles.circuitTable}
              rowKey="key"
              dataSource={tableData}
              columns={filteredColumns}
              pagination={false}
              expandable={
                toggle === 'hierarchical'
                  ? {
                      expandedRowRender: renderSubcircuits,
                      expandedRowKeys,
                      onExpand: handleExpandRow,
                      expandIcon: () => null,
                      rowExpandable: (record) =>
                        !!record.subcircuits && record.subcircuits.length > 0,
                    }
                  : undefined
              }
              rowClassName={(record: FilteredCircuit) =>
                toggle === 'hierarchical' && record.isNonMatchingParent
                  ? styles.nonMatchingRow
                  : styles.matchingRow
              }
            />
          )}
        </div>
      </div>
      <TableScrollButton
        scrollToEnd={scrollToEnd}
        isAtEnd={isAtEnd}
        scrollToStart={scrollToStart}
        isAtStart={isAtStart}
      />
      {filterPanelActive && (
        <ListingFilterPanel
          toggleDisplay={() => setFilterPanelActive(false)}
          dataType={DataType.Circuit}
          dataKey="circuits"
          filters={coreFilters}
          setFilters={handleSetCoreFilters}
          facets={undefined}
          showDisplayTrigger
          useBrainRegion={false}
        />
      )}
      <div
        className={classNames(
          'out-expo bg-primary-9 transition-right fixed bottom-3 z-100 h-screen w-[44vw] overflow-y-scroll p-8 duration-500',
          downloadModalOpen ? 'right-0' : '-right-full'
        )}
      >
        {circuitToDownload !== null && (
          <DownloadContainer
            content={circuitToDownload}
            handleCloseDownloadModal={handleCloseDownloadModal}
          />
        )}
      </div>
      <div
        className={classNames(
          'ease-out-back fixed top-0 left-0 z-80 h-screen w-screen bg-black transition-opacity duration-500',
          downloadModalOpen ? 'opacity-50' : 'pointer-events-none opacity-0'
        )}
      />
    </div>
  );
}
