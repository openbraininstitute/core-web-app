import { Table } from 'antd';
import { usePathname } from 'next/navigation';
import { Key, ReactNode, useCallback, useState } from 'react';
import { CircuitSchemaProps } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import columns from './Columns';
import SubcircuitTable from './SubcircuitsTable';
import DownloadContainer from './download/DownloadContainer';

import styles from './exploreCircuitTable.module.scss';

export type CustomRowProps = {
  circuit?: CircuitSchemaProps;
  children: ReactNode;
  record?: CircuitSchemaProps;
  handleExpandRow: (expanded: boolean, record: CircuitSchemaProps) => void;
  expandedRowKeys: Key[];
  className?: string;
  style?: React.CSSProperties;
  'data-row-key'?: string;
};

export default function CircuitTable({
  data,
  downloadable = true,
  // hasSearch = true,
}: {
  data: CircuitSchemaProps[];
  downloadable?: boolean;
  // hasSearch?: boolean;
}) {
  const [circuitToDownoload, setCircuitToDownload] = useState<CircuitSchemaProps | null>(null);
  const [downloadModalOpen, SetDownloadModalOpen] = useState<boolean>(false);

  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);

  // FILTERING
  // const [searchQuery, setSearchQuery] = useState<string>('');
  // const [numericFilter, setNumericFilter] = useState<NumericFilterOptions | null>(null);
  // const [minValue, setMinValue] = useState<number | undefined>(undefined);
  // const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

  // const filteredData = useFilteredData(data, { searchQuery, numericFilter });

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
          downloadable={downloadable}
        />
      ) : null,
    [
      expandedRowKeys,
      handleExpandRow,
      downloadable,
      handleOpenDownloadModal,
      handleRowExpandClick,
      isCircuitDetailPage,
    ]
  );

  // const lastRow: CircuitSchemaProps | undefined = selectedRows.at(-1);
  // const fileUrl = lastRow?.files?.[0]?.url;

  return (
    <div className="relative flex w-full flex-col">
      {/* {hasSearch && (
        <div className="relative mb-8 flex w-full flex-row justify-between px-8">
          <SearchBar searchQuery={searchQuery} onSearchChange={setSearchQuery} />
          <NumericFilters
            filter={numericFilter}
            minValue={minValue}
            maxValue={maxValue}
            onFilterChange={setNumericFilter}
            onMinChange={setMinValue}
            onMaxChange={setMaxValue}
          />
        </div>
      )} */}
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
          />
          {/* {fileUrl && <DownloadCircuitButton fileUrl={fileUrl} selectedRowKeys={selectedRowKeys} />} */}
        </div>
        {downloadModalOpen && circuitToDownoload !== null && (
          <DownloadContainer
            content={circuitToDownoload}
            handleCloseDownloadModal={handleCloseDownloadModal}
          />
        )}
      </div>
    </div>
  );
}
