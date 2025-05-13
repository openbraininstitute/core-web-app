import { Table } from 'antd';
import { usePathname } from 'next/navigation';
import { Key, useCallback, useEffect, useState } from 'react';
import { CircuitSchemaProps, NumericFilterOptions } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import { circuitMatchFilter } from '../utils/circuits-match-filter';
import collectExpandableKeys from '../utils/collectExpandableKeys';

import columns from './Columns';
import SubcircuitTable from './SubcircuitsTable';
import DownloadContainer from './download/DownloadContainer';

import NumericFilters from './NumericFilters';

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
  // const [searchQuery, setSearchQuery] = useState<string>('');
  const [numericFilter, setNumericFilter] = useState<NumericFilterOptions | null>(null);
  const [minValue, setMinValue] = useState<number | undefined>(undefined);
  const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (numericFilter) {
      const expandableKeys = collectExpandableKeys(data);
      setExpandedRowKeys(expandableKeys);
    } else {
      setExpandedRowKeys([]);
    }
  }, [numericFilter, data]);

  const handleRowExpandClick = useCallback((row: CircuitSchemaProps, _index: number) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  }, []);

  const pathname = usePathname();
  const isCircuitDetailPage = pathname.includes('/circuit/');

  // DOWNLOAD MODAL
  const handleOpenDownloadModal = useCallback((record: CircuitSchemaProps) => {
    setCircuitToDownload(record);
    SetDownloadModalOpen(true);
  }, []);

  const handleCloseDownloadModal = useCallback(() => {
    setCircuitToDownload(null);
    SetDownloadModalOpen(false);
  }, []);

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
          columns={columns(
            expandedRowKeys,
            calculateSubcircuitsForParent,
            handleRowExpandClick,
            isCircuitDetailPage,
            handleOpenDownloadModal
          )}
          circuit={circuit}
          expandedRowKeys={expandedRowKeys}
          onExpand={handleExpandRow}
          numericFilter={numericFilter} // Pass filter props
          minValue={minValue}
          maxValue={maxValue}
        />
      ) : null,
    [
      expandedRowKeys,
      handleExpandRow,
      handleOpenDownloadModal,
      handleRowExpandClick,
      isCircuitDetailPage,
      numericFilter,
      minValue,
      maxValue,
    ]
  );

  return (
    <div className="relative flex w-full flex-col">
      {hasSearch && (
        <div className="relative mb-8 flex w-full flex-row justify-between px-8">
          {/* <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} /> */}
          <NumericFilters
            filter={numericFilter}
            minValue={minValue}
            maxValue={maxValue}
            onFilterChange={setNumericFilter}
            onMinChange={setMinValue}
            onMaxChange={setMaxValue}
          />
        </div>
      )}
      <div className="relative w-full overflow-x-scroll">
        <div className="tableAndButton">
          <Table
            className={styles.circuitTable}
            style={
              {
                '--ant-table-expand-icon-col-width': '0px',
              } as React.CSSProperties
            }
            dataSource={data}
            columns={columns(
              expandedRowKeys,
              calculateSubcircuitsForParent,
              handleRowExpandClick,
              isCircuitDetailPage,
              handleOpenDownloadModal
            )}
            pagination={false}
            expandable={{
              expandedRowRender: renderSubcircuits,
              expandedRowKeys,
              onExpand: handleExpandRow,
              expandIcon: () => null,
              rowExpandable: (record) => !!record.subcircuits && record.subcircuits.length > 0,
            }}
            rowClassName={(record) =>
              circuitMatchFilter(record, numericFilter, minValue, maxValue)
                ? styles.matchingRow
                : styles.nonMatchingRow
            }
          />
        </div>
        <>
          <div
            className={classNames(
              'out-expo fixed bottom-3 z-[999999] h-screen w-[44vw] overflow-y-scroll bg-primary-9 p-8 transition-right duration-500',
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
              'fixed left-0 top-0 z-[999998] h-screen w-screen bg-black transition-opacity duration-500 ease-out-back',
              downloadModalOpen ? 'opacity-50' : 'pointer-events-none opacity-0'
            )}
          />
        </>
      </div>
    </div>
  );
}
