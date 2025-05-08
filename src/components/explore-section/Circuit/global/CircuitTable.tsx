import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { TableRowSelection } from 'antd/es/table/interface';
import { usePathname } from 'next/navigation';
import { Key, ReactNode, useCallback, useMemo, useState } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import { CircuitSchemaProps } from '../type';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';
import columns from './Columns';
import CustomRow from './CustomRow';
import DownloadCircuitButton from './DownloadCircuitButton';
import ResizableTitle from './ResizableTitle';
import SubcircuitTable from './SubcircuitsTable';

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

function findSelectedCircuit(
  circuits: CircuitSchemaProps[],
  key: string
): CircuitSchemaProps | null {
  for (const circuit of circuits) {
    if (circuit.key === key) {
      return circuit;
    }
    if (circuit.subcircuits) {
      const found = findSelectedCircuit(circuit.subcircuits, key);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

function RowWrapper({
  handleExpandRow,
  expandedRowKeys,
  mergedColumns,
  ...props
}: CustomRowProps & {
  handleExpandRow: (expanded: boolean, record: CircuitSchemaProps) => void;
  expandedRowKeys: Key[];
  mergedColumns: ColumnsType<CircuitSchemaProps>;
}) {
  return (
    <CustomRow
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      handleExpandRow={handleExpandRow}
      expandedRowKeys={expandedRowKeys}
      columnCount={mergedColumns.length}
    />
  );
}

export default function CircuitTable({
  data,
  downloadable = true,
  // hasSearch = true,
}: {
  data: CircuitSchemaProps[];
  downloadable?: boolean;
  // hasSearch?: boolean;
}) {
  // ROWS
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    name: 150,
    description: 300,
    brainRegion: 150,
    numberOfNeurons: 100,
    specie: 120,
    contributorSimple: 150,
    registrationDate: 150,
    hasSubcircuits: 120,
  });

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

  const handleResize = useCallback(
    (key: string) =>
      (e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
        setColumnWidths((prev) => {
          const newWidths = { ...prev, [key]: size.width };
          return newWidths;
        });
      },
    []
  );

  const pathname = usePathname();
  const isCircuitDetailPage = pathname.includes('/circuit/');

  const mergedColumns: ColumnsType<CircuitSchemaProps> = useMemo(() => {
    return columns(
      expandedRowKeys,
      calculateSubcircuitsForParent,
      handleRowExpandClick,
      handleResize,
      isCircuitDetailPage
    ).map((col) => ({
      ...col,
      width: columnWidths[col.key as string] || col.width,
    }));
  }, [expandedRowKeys, handleRowExpandClick, handleResize, columnWidths, isCircuitDetailPage]);

  const rowSelection = useMemo(
    (): TableRowSelection<CircuitSchemaProps> | undefined =>
      downloadable
        ? {
            type: 'checkbox',
            selectedRowKeys,
            onChange: (newSelectedRowKeys: Key[], _selectedRows: CircuitSchemaProps[]) => {
              const key = newSelectedRowKeys[0] as string;
              const updatedKeys = selectedRowKeys[0] === key ? [] : [key];
              setSelectedRowKeys(updatedKeys);
            },
          }
        : undefined,
    [selectedRowKeys, downloadable]
  );

  const handleExpandRow = useCallback((expanded: boolean, row: CircuitSchemaProps) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      expanded ? [...prev, rowKey] : prev.filter((key) => key !== rowKey)
    );
  }, []);

  const selectedRows = useMemo(() => {
    if (!selectedRowKeys[0]) return [];
    const selectedCircuit = findSelectedCircuit(data, selectedRowKeys[0]);
    return selectedCircuit ? [selectedCircuit] : [];
  }, [data, selectedRowKeys]);

  const renderSubcircuits = useCallback(
    (circuit: CircuitSchemaProps) =>
      circuit.subcircuits && circuit.subcircuits.length > 0 ? (
        <SubcircuitTable
          circuit={circuit}
          mergedColumns={mergedColumns}
          rowSelection={rowSelection || ({} as TableRowSelection<CircuitSchemaProps>)}
          expandedRowKeys={expandedRowKeys}
          onExpand={handleExpandRow}
          downloadable={downloadable}
          selectedRows={selectedRows}
          selectedRowKeys={selectedRowKeys}
        />
      ) : null,
    [
      mergedColumns,
      rowSelection,
      expandedRowKeys,
      handleExpandRow,
      downloadable,
      selectedRowKeys,
      selectedRows,
    ]
  );

  const rowWrapperWithColumns = (props: CustomRowProps) => (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <RowWrapper
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      handleExpandRow={handleExpandRow}
      expandedRowKeys={expandedRowKeys}
      mergedColumns={mergedColumns}
    />
  );

  const lastRow = selectedRows.at(-1);
  const fileUrl = lastRow?.files?.[0]?.url;

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
            data-row-selection={downloadable && downloadable.toString()}
            components={{
              header: {
                cell: ResizableTitle,
              },
              body: {
                row: rowWrapperWithColumns,
              },
            }}
            dataSource={data}
            columns={mergedColumns}
            pagination={false}
            rowSelection={downloadable ? rowSelection : undefined}
            expandable={{
              expandedRowRender: renderSubcircuits,
              expandedRowKeys,
              onExpand: handleExpandRow,
              expandIcon: () => null,
              rowExpandable: (record) => !!record.subcircuits && record.subcircuits.length > 0,
            }}
          />
          {fileUrl && <DownloadCircuitButton fileUrl={fileUrl} selectedRowKeys={selectedRowKeys} />}
        </div>
      </div>
    </div>
  );
}
