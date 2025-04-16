import { Table } from 'antd';
import { ColumnsType } from 'antd/es/table';
import { Key, useCallback, useMemo, useState } from 'react';

import { TableRowSelection } from 'antd/es/table/interface';
import { ResizeCallbackData } from 'react-resizable';
import SubcircuitTable from '../ListView/SubcircuitsTable';
import calculateSubcircuitsForParent from '../utils/calculate-subcircuits-for-parent';

import NumericFilters from '../ListView/NumericFilters';
import SearchBar from '../ListView/SearchBar';
import { CircuitSchemaProps } from '../type';
import { NumericFilterOptions } from '../utils/filter-circuits-by-numeric';
import getExpandableRowKeys from '../utils/get-expandable-row-key';
import { useFilteredData } from '../utils/use-filtered-data';

import DownloadCircuitButton from '../ListView/DownloadCircuitButton';
import columns from './Columns';
import ResizableTitle from './ResizableTitle';

import { classNames } from '@/util/utils';
import styles from './exploreCircuitTable.module.scss';

export default function CircuitTable({
  data,
  downloadable = true,
  hasSearch = true,
}: {
  data: CircuitSchemaProps[];
  downloadable?: boolean;
  hasSearch?: boolean;
}) {
  // ROWS
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>(getExpandableRowKeys(data));
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
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [numericFilter, setNumericFilter] = useState<NumericFilterOptions | null>(null);
  const [minValue, setMinValue] = useState<number | undefined>(undefined);
  const [maxValue, setMaxValue] = useState<number | undefined>(undefined);

  const filteredData = useFilteredData(data, { searchQuery, numericFilter });

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

  const mergedColumns: ColumnsType<CircuitSchemaProps> = useMemo(
    () =>
      columns(
        expandedRowKeys,
        calculateSubcircuitsForParent,
        handleRowExpandClick,
        handleResize
      ).map((col) => ({
        ...col,
        width: columnWidths[col.key as string] || col.width,
      })),
    [expandedRowKeys, handleRowExpandClick, handleResize, columnWidths]
  );

  const rowSelection = useMemo(
    (): TableRowSelection<CircuitSchemaProps> | undefined =>
      downloadable
        ? {
            type: 'radio',
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

  const renderSubcircuits = useCallback(
    (circuit: CircuitSchemaProps) => (
      <SubcircuitTable
        circuit={circuit}
        mergedColumns={mergedColumns}
        rowSelection={rowSelection || ({} as TableRowSelection<CircuitSchemaProps>)}
        expandedRowKeys={expandedRowKeys}
        onExpand={handleExpandRow}
        downloadable={downloadable}
      />
    ),
    [mergedColumns, rowSelection, expandedRowKeys, handleExpandRow, downloadable]
  );

  const selectedRows = data.flatMap((circuit) =>
    circuit.key === selectedRowKeys[0]
      ? [circuit]
      : (circuit.subcircuit || []).filter((sub) => sub.key === selectedRowKeys[0])
  );

  const lastRow = selectedRows.at(-1);
  const fileUrl = lastRow?.files?.[0]?.url;

  return (
    <div className="relative flex w-full flex-col">
      {hasSearch && (
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
      )}
      <div className="relative w-full overflow-x-scroll">
        {downloadable ? (
          <div className="tableAndButton">
            <Table
              className={classNames(
                '[&_.ant-table-tbody]:bg-[#FAFAFA]',
                '[&_.ant-table-row]:bg-[#FAFAFA]',
                '[&_.ant-table-thead_th]:!text-sm',
                '[&_.ant-table-thead_th]:!font-normal',
                '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
                '[&_.ant-table-thead_th]:uppercase',
                '[&_.ant-table-thead_th]:tracking-[0.05em]',
                '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
                '[&_.ant-table-thead > tr > th]:border-b-0',
                '[&_.ant-table-expand-icon-col]:w-0',
                '[&_.ant-table-expand-icon-col]:hidden',
                styles.circuitTable
              )}
              style={
                {
                  '--ant-table-expand-icon-col-width': '0px',
                } as React.CSSProperties
              }
              data-row-selection={downloadable.toString()}
              components={{
                header: {
                  cell: ResizableTitle,
                },
              }}
              dataSource={filteredData}
              columns={mergedColumns}
              pagination={false}
              rowSelection={rowSelection}
              expandable={{
                expandedRowRender: renderSubcircuits,
                expandedRowKeys,
                onExpand: (expanded: boolean, row: CircuitSchemaProps) => {
                  const rowKey = row.key;
                  setExpandedRowKeys((prev) =>
                    expanded ? [...prev, rowKey] : prev.filter((key) => key !== rowKey)
                  );
                },
                expandIcon: () => null,
              }}
            />
            {fileUrl && (
              // {fileUrl && searchQuery !== '' && (
              <DownloadCircuitButton fileUrl={fileUrl} selectedRowKeys={selectedRowKeys} />
            )}
          </div>
        ) : (
          <Table
            className={classNames(
              '[&_.ant-table-tbody]:bg-[#FAFAFA]',
              '[&_.ant-table-row]:bg-[#FAFAFA]',
              '[&_.ant-table-thead_th]:!text-sm',
              '[&_.ant-table-thead_th]:!font-normal',
              '[&_.ant-table-thead_th]:!text-[#8C8C8C]',
              '[&_.ant-table-thead_th]:uppercase',
              '[&_.ant-table-thead_th]:tracking-[0.05em]',
              '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
              '[&_.ant-table-thead > tr > th]:border-b-0',
              '[&_.ant-table-expand-icon-col]:w-0',
              '[&_.ant-table-expand-icon-col]:hidden',
              styles.circuitTable
            )}
            style={
              {
                '--ant-table-expand-icon-col-width': '0px',
              } as React.CSSProperties
            }
            components={{
              header: {
                cell: ResizableTitle,
              },
            }}
            dataSource={filteredData}
            columns={mergedColumns}
            pagination={false}
            expandable={{
              expandedRowRender: renderSubcircuits,
              expandedRowKeys,
              onExpand: (expanded: boolean, row: CircuitSchemaProps) => {
                const rowKey = row.key;
                setExpandedRowKeys((prev) =>
                  expanded ? [...prev, rowKey] : prev.filter((key) => key !== rowKey)
                );
              },
              expandIcon: () => null,
            }}
          />
        )}
      </div>
    </div>
  );
}
