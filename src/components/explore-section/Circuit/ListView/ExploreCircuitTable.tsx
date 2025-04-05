'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Table, Tooltip } from 'antd';
import { ColumnsType, TableRowSelection } from 'antd/es/table/interface';
import React, { Key, useState } from 'react';
import { Resizable, ResizeCallbackData } from 'react-resizable';

import CIRCUITS_FULL from '../content/circuits_tree_formatted';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';
import getExpandableRowKeys from '../utils/getExpandableRowKey';

import filterCircuitsByNumeric, { NumericFilterOptions } from '../utils/filterCircuitsByNumeric';

import calculateSubcircuitsForParent from '../utils/calculateSubcircuitsForParent';
import filterCircuits from '../utils/filterCircuits';
import NumericFilters from './NumericFilters';

import columns from './Columns';
import SearchBar from './SearchBar';

import { classNames } from '@/util/utils';

import styles from './ExploreCircuiteTable.module.scss';

interface ResizableTitleProps {
  onResize?: (e: React.SyntheticEvent, data: ResizeCallbackData) => void;
  width?: number;
  [key: string]: any;
}

export function ResizableTitle(props: ResizableTitleProps) {
  const { onResize, width, ...restProps } = props;

  if (!width) {
    // eslint-disable-next-line react/jsx-props-no-spreading
    return <th {...restProps} />;
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLSpanElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.stopPropagation();
    }
  };

  return (
    <Resizable
      width={width}
      height={0}
      handle={
        <span
          className="resize-handle"
          role="button"
          tabIndex={0}
          aria-label={`Resize ${restProps.title || 'column'}`}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={handleKeyDown}
        />
      }
      onResize={onResize}
    >
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <th {...restProps} />
    </Resizable>
  );
}

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

  const handleResize =
    (key: string) =>
    (e: React.SyntheticEvent, { size }: ResizeCallbackData) => {
      setColumnWidths((prev) => ({
        ...prev,
        [key]: size.width,
      }));
    };

  const handleExpandRow = (row: CircuitSchemaProps, _index: number) => {
    if (!row.hasSubcircuits) return;
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  };

  const mergedColumns: ColumnsType<CircuitSchemaProps> = columns(
    expandedRowKeys,
    calculateSubcircuitsForParent,
    handleExpandRow,
    handleResize
  ).map((col) => ({
    ...col,
    width: columnWidths[col.key as string] || col.width,
  }));

  let filteredData = searchQuery ? filterCircuits(CIRCUITS_FULL, searchQuery) : CIRCUITS_FULL;
  if (numericFilter) {
    filteredData = filterCircuitsByNumeric(filteredData, {
      property: numericFilter.property,
      type: numericFilter.type,
      min: minValue,
      max: maxValue,
    });
  }

  const rowSelection: TableRowSelection<CircuitSchemaProps> = {
    type: 'radio',
    selectedRowKeys,
    onChange: (newSelectedRowKeys: Key[], _selectedRows: CircuitSchemaProps[]) => {
      const key = newSelectedRowKeys[0] as string;

      const updatedKeys = selectedRowKeys[0] === key ? [] : [key];
      setSelectedRowKeys(updatedKeys);
    },
  };

  const expandedRowRender = (circuit: CircuitSchemaProps): JSX.Element => {
    return (
      <div className="relative flex flex-col">
        <div className="relative flex flex-row pl-2">
          <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
          <span className="ml-3 pb-2 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
            Subcircuits
          </span>
        </div>
        <Table<CircuitSchemaProps>
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
          columns={mergedColumns}
          dataSource={circuit.subcircuit || []}
          pagination={false}
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender,
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
      </div>
    );
  };

  const selectedRows = CIRCUITS_FULL.flatMap((circuit) =>
    circuit.key === selectedRowKeys[0]
      ? [circuit]
      : (circuit.subcircuit || []).filter((sub) => sub.key === selectedRowKeys[0])
  );

  const lastRow = selectedRows.at(-1);
  const fileUrl = lastRow?.files?.[0]?.url;

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
          expandedRowRender,
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
        <a
          href={fileUrl}
          type="button"
          className="absolute bottom-6 right-10 flex h-20 w-[150px] items-center justify-center bg-primary-8 text-xl transition-bottom duration-300 ease-in-out"
          style={{
            visibility: selectedRowKeys && selectedRowKeys.length > 0 ? 'visible' : 'hidden',
          }}
        >
          <span>Download</span>
          <Tooltip
            title={
              <a
                href="https://github.com/openbraininstitute/ConnectomeUtilities/blob/main/README.md"
                target="_blank"
                onClick={(e) => e.stopPropagation()}
              >
                The connectome will be downloaded in Connectome Utilities format, see more here.
              </a>
            }
          >
            <InfoCircleOutlined className="ml-2" />
          </Tooltip>
        </a>
      )}
    </div>
  );
}
