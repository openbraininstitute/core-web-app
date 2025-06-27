import { Table } from 'antd';
import { useAtom, useAtomValue } from 'jotai';
import moment from 'moment';
import { usePathname } from 'next/navigation';
import { Key, useCallback, useEffect, useMemo, useState } from 'react';
import { CircuitSchemaProps, FilteredCircuit } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import collectExpandableKeys from '../utils/collectExpandableKeys';
import { flattenCircuits } from '../utils/flatten-circuits';
import columns from './Columns';
import DownloadContainer from './download/download-container';
import CircuitsFilterPanel from './filters/circuits-filter-panel';
import FilterButton from './filters/filter-button';
import SearchBar from './search-bar';
import { columnsAtom, filtersAtom, setFilterAtom } from './state/columns';
import SubcircuitTable from './subcircuit-table';
import ViewToggle from './ViewToggle';

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
  const [downloadModalOpen, SetDownloadModalOpen] = useState<boolean>(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);

  // FILTERING
  const [filterPanelActive, setFilterPanelActive] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [, setFilter] = useAtom(setFilterAtom);

  // VIEWS
  const [toggle, setToggle] = useState<'hierarchical' | 'flat'>('hierarchical');

  // COLUMN VISIBILITY AND FILTERS FROM JOTAI
  const columnState = useAtomValue(columnsAtom);
  const filters = useAtomValue(filtersAtom);

  // RESET FILTERS
  const handleResetFilter = useCallback(() => {
    Object.keys(filters).forEach((columnId) => {
      setFilter({ columnId, filter: null });
    });
    setSearchQuery('');
  }, [filters, setFilter, setSearchQuery]);

  // DOWNLOAD MODAL
  const handleOpenDownloadModal = useCallback((record: CircuitSchemaProps) => {
    setCircuitToDownload(record);
    SetDownloadModalOpen(true);
  }, []);

  const handleCloseDownloadModal = useCallback(() => {
    setCircuitToDownload(null);
    SetDownloadModalOpen(false);
  }, []);

  // PATHNAME
  const pathname = usePathname();
  const isCircuitDetailPage = pathname.includes('/circuit/');

  // ROW EXPANSION
  const handleRowExpandClick = useCallback((row: CircuitSchemaProps, _index: number) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  }, []);

  // DATA
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

  // IF FILTERS ARE ACTIVE
  const filteredData = useMemo(() => {
    let result: CircuitSchemaProps[] =
      toggle === 'hierarchical' ? cleanedData.hierarchical : cleanedData.flattened;

    // Apply filters from filtersAtom
    Object.entries(filters).forEach(([columnId, filter]) => {
      if (!filter) return;

      const column = columnState.find((col) => col.id === columnId);
      const filterType = column?.filterType;

      result = result.filter((circuit) => {
        const value = circuit[columnId as keyof CircuitSchemaProps];

        if (filterType === 'text' && typeof value === 'string' && filter.min) {
          return value.toLowerCase().includes((filter.min as string).toLowerCase());
        }

        if (filterType === 'numeric' && typeof value === 'number' && filter.type) {
          const min = filter.min as number | undefined;
          const max = filter.max as number | undefined;
          if (filter.type === 'greaterThan' && min !== undefined) {
            return value > min;
          }
          if (filter.type === 'lessThan' && max !== undefined) {
            return value < max;
          }
          if (filter.type === 'between' && min !== undefined && max !== undefined) {
            return value >= min && value <= max;
          }
        }

        if (filterType === 'select' && filter.type) {
          return value === filter.type;
        }

        if (filterType === 'date' && typeof value === 'string' && filter.min) {
          return moment(value).isSame(moment(filter.min as string), 'day');
        }

        if (filterType === 'boolean' && filter.min) {
          return value === (filter.min === 'true');
        }

        return true;
      });
    });

    // Apply searchQuery filter
    if (searchQuery) {
      result = result.filter((circuit) =>
        ['name', 'brainRegion', 'scale', 'specie', 'publishedIn', 'buildCategory'].some((field) => {
          const value = circuit[field as keyof CircuitSchemaProps];
          return (
            typeof value === 'string' && value.toLowerCase().includes(searchQuery.toLowerCase())
          );
        })
      );
    }

    return result;
  }, [cleanedData, toggle, filters, searchQuery, columnState]);

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
    const selectedData = toggle === 'hierarchical' ? filteredData : flattenedData;
    return selectedData;
  }, [toggle, filteredData, flattenedData]);

  // COLUMN FILTERED
  const filteredColumns = useMemo(() => {
    const allColumns = columns(
      expandedRowKeys,
      calculateSubcircuitsForParent,
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
  ]);

  useEffect(() => {
    if (toggle === 'hierarchical' && searchQuery) {
      const expandableKeys = collectExpandableKeys(cleanedData.hierarchical);
      setExpandedRowKeys(expandableKeys);
    } else {
      setExpandedRowKeys([]);
    }
  }, [searchQuery, cleanedData, toggle]);

  // ROW EXPANSION & SUBCIRCUITS
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

  return (
    <div className="relative flex w-full flex-col">
      {hasSearch && (
        <div className="relative mb-8 flex w-full flex-row justify-between px-8">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <div className="flex flex-row items-center gap-x-4">
            {Object.values(filters).some((f) => f !== null) && (
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
              setActive={setFilterPanelActive}
              numberOfFilters={Object.values(filters).filter((f) => f !== null).length}
              numberOfActiveColumns={columnState.filter((col) => col.isActive).length}
            />
            <ViewToggle toggle={toggle} setToggle={setToggle} />
          </div>
        </div>
      )}
      <div className="relative w-full overflow-x-scroll">
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
        <CircuitsFilterPanel
          isActive={filterPanelActive}
          toggle={() => setFilterPanelActive(!filterPanelActive)}
        />
        <>
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
        </>
      </div>
    </div>
  );
}
