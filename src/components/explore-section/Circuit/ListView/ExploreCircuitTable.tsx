'use client';

import { Table } from 'antd';
import { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import React, { Key, useCallback, useMemo, useState } from 'react';
import { ResizeCallbackData } from 'react-resizable';

import CIRCUITS_FULL from '../content/circuits_tree_formatted';
import { CircuitSchemaProps } from '../type';
import getExpandableRowKeys from '../utils/getExpandableRowKey';

import filterCircuitsByNumeric, { NumericFilterOptions } from '../utils/filterCircuitsByNumeric';

import calculateSubcircuitsForParent from '../utils/calculateSubcircuitsForParent';
import filterCircuits from '../utils/filterCircuits';
import NumericFilters from './NumericFilters';

import columns from './Columns';
import SearchBar from './SearchBar';

import DownloadCircuitButton from './DownloadCircuitButton';
import ResizableTitle from './ResizableTitle';
import SubcircuitTable from './SubcircuitsTable';

import { classNames } from '@/util/utils';

import styles from './ExploreCircuiteTable.module.scss';

export default function ExploreCircuitTable() {
  // STATES
  const [expandedRowKeys, setExpandedRowKeys] = useState<Key[]>(
    getExpandableRowKeys(CIRCUITS_FULL)
  );
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

  const handleExpandRow = useCallback((expanded: boolean, row: CircuitSchemaProps) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      expanded ? [...prev, rowKey] : prev.filter((key) => key !== rowKey)
    );
  }, []);

  const handleRowExpandClick = useCallback((row: CircuitSchemaProps, _index: number) => {
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  }, []);

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

  let filteredData = searchQuery ? filterCircuits(CIRCUITS_FULL, searchQuery) : CIRCUITS_FULL;
  if (numericFilter) {
    filteredData = filterCircuitsByNumeric(filteredData, {
      property: numericFilter.property,
      type: numericFilter.type,
      min: minValue,
      max: maxValue,
    });
  }

  const rowSelection = useMemo(
    (): TableRowSelection<CircuitSchemaProps> => ({
      type: 'radio',
      selectedRowKeys,
      onChange: (newSelectedRowKeys: Key[], _selectedRows: CircuitSchemaProps[]) => {
        const key = newSelectedRowKeys[0] as string;
        const updatedKeys = selectedRowKeys[0] === key ? [] : [key];
        setSelectedRowKeys(updatedKeys);
      },
    }),
    [selectedRowKeys]
  );

  const selectedRows = CIRCUITS_FULL.flatMap((circuit) =>
    circuit.key === selectedRowKeys[0]
      ? [circuit]
      : (circuit.subcircuit || []).filter((sub) => sub.key === selectedRowKeys[0])
  );

  const lastRow = selectedRows.at(-1);
  const fileUrl = lastRow?.files?.[0]?.url;

  const renderSubcircuits = useCallback(
    (circuit: CircuitSchemaProps) => (
      <SubcircuitTable
        circuit={circuit}
        mergedColumns={mergedColumns}
        rowSelection={rowSelection}
        expandedRowKeys={expandedRowKeys}
        onExpand={handleExpandRow}
      />
    ),
    [mergedColumns, rowSelection, expandedRowKeys, handleExpandRow]
  );

  return (
    <div className="relative flex w-full flex-col pt-10">
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
        components={{
          header: {
            cell: ResizableTitle,
          },
        }}
        style={{ '--ant-table-expand-icon-col-width': '0px' } as React.CSSProperties}
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

      {fileUrl && <DownloadCircuitButton fileUrl={fileUrl} selectedRowKeys={selectedRowKeys} />}
    </div>
  );
}
