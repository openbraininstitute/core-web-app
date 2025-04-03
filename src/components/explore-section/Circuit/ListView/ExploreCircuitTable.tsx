'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Table, Tooltip } from 'antd';
import { TableRowSelection } from 'antd/es/table/interface';
import { useState } from 'react';
import CIRCUITS_FULL from '../content/circuits_tree_formatted';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import { CircuitSchemaProps } from '../type';
import calculateSubcircuitsForParent from '../utils/calculateSubcircuitsForParent';
import getExpandableRowKeys from '../utils/getExpandableRowKey';

import columns from './Columns';

import { classNames } from '@/util/utils';

import styles from './ExploreCircuiteTable.module.scss';

export default function ExploreCircuitTable() {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>(
    getExpandableRowKeys(CIRCUITS_FULL)
  );
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const handleExpandRow = (row: CircuitSchemaProps, _index: number) => {
    if (!row.hasSubcircuits) return;
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  };

  const rowSelection: TableRowSelection<CircuitSchemaProps> = {
    type: 'radio',
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[], _selectedRows: CircuitSchemaProps[]) => {
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
          columns={columns(expandedRowKeys, calculateSubcircuitsForParent, handleExpandRow)}
          dataSource={circuit.subcircuit || []}
          pagination={false}
          rowSelection={rowSelection}
          expandable={{
            expandedRowRender,
            expandedRowKeys,
            onExpand: (expanded: boolean, row: CircuitSchemaProps) => {
              const rowKey = row.key;
              setExpandedRowKeys((prev) =>
                expanded ? [...prev, rowKey] : prev.filter((key: string) => key !== rowKey)
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

  const lastRow = selectedRows[selectedRows.length - 1];
  const fileUrl = lastRow?.files?.[0]?.url;

  return (
    <div className="pt-10">
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
        style={{ '--ant-table-expand-icon-col-width': '0px' } as React.CSSProperties}
        dataSource={CIRCUITS_FULL}
        columns={columns(expandedRowKeys, calculateSubcircuitsForParent, handleExpandRow)}
        pagination={false}
        rowSelection={rowSelection}
        expandable={{
          expandedRowRender,
          expandedRowKeys,
          onExpand: (expanded: boolean, row: CircuitSchemaProps) => {
            const rowKey = row.key;
            setExpandedRowKeys((prev) =>
              expanded ? [...prev, rowKey] : prev.filter((key: string) => key !== rowKey)
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
