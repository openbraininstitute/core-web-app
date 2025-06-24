import { Table } from 'antd';
import { usePathname } from 'next/navigation';
import { Key, useCallback, useEffect, useMemo, useState } from 'react';
import { CircuitSchemaProps, FilteredCircuit, NumericFilterOptions } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import collectExpandableKeys from '../utils/collectExpandableKeys';
import { flattenCircuits } from '../utils/flatten-circuits';

import { circuitMatchFilter } from '../utils/circuits-match-filter';
import { filterCircuitsWithParents } from '../utils/filter-circuits-with-parent';
import columns from './Columns';
import DownloadContainer from './download/download-container';
import SubcircuitTable from './subcircuit-table';

import CircuitFilters from './circuit-filter';
import SearchBar from './search-bar';
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [numericFilter, setNumericFilter] = useState<NumericFilterOptions | null>(null);
  const [scaleFilter, setScaleFilter] = useState<'smallMicrocircuit' | 'microcircuit' | null>(null);
  const [buildCategoryFilter, setBuildCategoryFilter] = useState<string | null>(null);
  const [minValue, setMinValue] = useState<number | undefined>(undefined);
  const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

  // VIEWS
  const [toggle, setToggle] = useState<'hierarchical' | 'flat'>('hierarchical');

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
      if (numberOfNeurons === 0) {
        throw new Error('Number of neurons is not a number or is NaN');
      }

      return {
        ...circuit,
        key: circuit.key || `circuit-${Math.random().toString(36).slice(2)}`,
        numberOfNeurons,
        name: circuit.name || 'Unknown',
        brainRegion: circuit.brainRegion || 'Unknown',
        scale: circuit.scale ? circuit.scale.toLowerCase() : 'unknown',
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
    if (toggle === 'hierarchical') {
      const result = filterCircuitsWithParents(
        cleanedData.hierarchical,
        numericFilter,
        minValue,
        maxValue,
        searchQuery,
        scaleFilter,
        false,
        buildCategoryFilter
      );
      return result;
    }
    const result = cleanedData.flattened.filter((circuit) =>
      circuitMatchFilter(
        circuit,
        numericFilter,
        minValue,
        maxValue,
        searchQuery,
        scaleFilter,
        buildCategoryFilter
      )
    );
    return result;
  }, [
    cleanedData,
    numericFilter,
    minValue,
    maxValue,
    searchQuery,
    scaleFilter,
    toggle,
    buildCategoryFilter,
  ]);

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
      numericFilter,
      minValue,
      maxValue,
      searchQuery,
      buildCategoryFilter
    );
    const result =
      toggle === 'flat' ? allColumns.filter((col) => col.key !== 'subcircuits') : allColumns;
    return result;
  }, [
    toggle,
    expandedRowKeys,
    isCircuitDetailPage,
    handleOpenDownloadModal,
    handleRowExpandClick,
    numericFilter,
    minValue,
    maxValue,
    searchQuery,
    buildCategoryFilter,
  ]);

  useEffect(() => {
    if (
      toggle === 'hierarchical' &&
      (numericFilter || searchQuery || scaleFilter || buildCategoryFilter)
    ) {
      const expandableKeys = collectExpandableKeys(cleanedData.hierarchical);
      setExpandedRowKeys(expandableKeys);
    } else {
      setExpandedRowKeys([]);
    }
  }, [
    numericFilter,
    minValue,
    maxValue,
    searchQuery,
    scaleFilter,
    cleanedData,
    toggle,
    buildCategoryFilter,
  ]);

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
          numericFilter={numericFilter}
          minValue={minValue}
          maxValue={maxValue}
          searchQuery={searchQuery}
          scaleFilter={scaleFilter}
          buildCategoryFilter={buildCategoryFilter}
        />
      ) : null,
    [
      expandedRowKeys,
      handleExpandRow,
      numericFilter,
      minValue,
      maxValue,
      searchQuery,
      scaleFilter,
      buildCategoryFilter,
      filteredColumns,
    ]
  );

  return (
    <div className="relative flex w-full flex-col">
      {hasSearch && (
        <div className="relative mb-8 flex w-full flex-row justify-between px-8">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />

          <div className="relative flex flex-row items-center gap-x-8">
            <ViewToggle toggle={toggle} setToggle={setToggle} />
            <CircuitFilters
              filter={numericFilter}
              minValue={minValue}
              maxValue={maxValue}
              onFilterChange={(filter) => {
                setNumericFilter(filter);
                if (filter?.property === 'scaleType') {
                  setScaleFilter(filter.type as 'smallMicrocircuit' | 'microcircuit');
                  setNumericFilter(null);
                  setBuildCategoryFilter(null);
                } else if (filter?.property === 'buildCategory') {
                  setBuildCategoryFilter(filter.type);
                  setNumericFilter(null);
                  setScaleFilter(null);
                } else {
                  setScaleFilter(null);
                  setBuildCategoryFilter(null);
                }
              }}
              onMinChange={setMinValue}
              onMaxChange={setMaxValue}
            />
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
