'use client';

import { Key, useState, type JSX } from 'react';
import { Table, Tooltip } from 'antd';
import { TableRowSelection } from 'antd/es/table/interface';
import { InfoCircleOutlined } from '@ant-design/icons';
import circuitsFlat from '../content/circuits_flat';
import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';
import CIRCUITS from '../content/circuits_tree';
import { CircuitColumn, CircuitSchemaProps } from '../type';
import { ChevronRight } from '@/components/icons';
import truncate from '@/util/truncate';
import { classNames } from '@/util/utils';
import styles from './ExploreCircuiteTable.module.css';

const getExpandableRowKeys = (data: CircuitSchemaProps[]): string[] => {
  return data.reduce((acc, row) => {
    const subKeys = row.subcircuits ? getExpandableRowKeys(row.subcircuits) : [];
    return row.hasSubcircuits ? [...acc, row.key, ...subKeys] : [...acc, ...subKeys];
  }, [] as string[]);
};

export default function ExploreCircuitTable() {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>(getExpandableRowKeys(CIRCUITS));
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);

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
    onChange: (newSelectedRows: Key[]) => {
      setSelectedRowKeys(newSelectedRows);
    },
  };

  const calculateSubcircuitsForParent = (row: CircuitSchemaProps): number => {
    const directSubcircuits = row.subcircuits?.length || 0;
    const nestedSubcircuits = row.subcircuits
      ? row.subcircuits.reduce((sum, sub) => sum + calculateSubcircuitsForParent(sub), 0)
      : 0;
    return directSubcircuits + nestedSubcircuits;
  };

  const columns: CircuitColumn[] = [
    {
      title: 'Name',
      key: 'name',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap">{value.name}</span>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{truncate(value.description, 40)}</span>
      ),
      width: 300,
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.brainRegion}</span>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.numberOfNeurons}</span>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.species}</span>
      ),
    },
    {
      title: 'Contributor',
      key: 'contributorSimple',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.metadata.contributorSimple}</span>
      ),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      render: (value: CircuitSchemaProps) => (
        <span className="whitespace-nowrap font-normal">{value.metadata.registrationDate}</span>
      ),
    },
    {
      title: 'Subcircuits',
      key: 'hasSubcircuits',
      render: (value: CircuitSchemaProps, index?: number) => {
        const isExpanded = expandedRowKeys.includes(value.key);
        const totalSubcircuitsForParent = calculateSubcircuitsForParent(value);

        return (
          value.hasSubcircuits && (
            <button
              type="button"
              className="relative flex h-6 items-center justify-center text-base font-normal focus:outline-hidden"
              aria-label="Open subcircuit"
              onClick={() => handleExpandRow(value, index ?? -1)}
              disabled={!value.hasSubcircuits}
            >
              <div className="relative mr-6 block ">{totalSubcircuitsForParent}</div>
              <ChevronRight
                fill="#003A8C"
                className={classNames(
                  'relative top-px h-4 w-auto transition-transform duration-300 ease-in-out',
                  isExpanded ? 'rotate-90' : 'rotate-0'
                )}
              />
            </button>
          )
        );
      },
    },
  ];

  // SUBCIRCUIT TABLE - LEVEL 1
  const expandedRowRender = (circuit: CircuitSchemaProps): JSX.Element => {
    return (
      <div className="relative flex flex-col">
        <div className="flex-row] relative flex pl-2">
          <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
          <span className="ml-3 pb-2 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
            Subcircuits
          </span>
        </div>
        <Table<CircuitSchemaProps>
          className={classNames(
            '[&_.ant-table-tbody]:bg-[#FAFAFA]',
            '[&_.ant-table-row]:bg-[#FAFAFA]',
            '[&_.ant-table-thead_th]:text-sm!',
            '[&_.ant-table-thead_th]:font-normal!',
            '[&_.ant-table-thead_th]:text-[#8C8C8C]!',
            '[&_.ant-table-thead_th]:uppercase',
            '[&_.ant-table-thead_th]:tracking-[0.05em]',
            '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
            '[&_.ant-table-thead > tr > th]:border-b-0',
            '[&_.ant-table-expand-icon-col]:w-0',
            '[&_.ant-table-expand-icon-col]:hidden',
            styles.circuitTable
          )}
          columns={columns}
          dataSource={circuit.subcircuits || []}
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

  const selectedRows = circuitsFlat.filter((row: CircuitSchemaProps) =>
    selectedRowKeys.includes(row.key)
  );

  const lastRow = selectedRows.at(-1);
  const file = lastRow?.files?.[0];
  const fileUrl = file?.url;

  return (
    <div className="pt-10">
      <Table
        className={classNames(
          '[&_.ant-table-tbody]:bg-[#FAFAFA]',
          '[&_.ant-table-row]:bg-[#FAFAFA]',
          '[&_.ant-table-thead_th]:text-sm!',
          '[&_.ant-table-thead_th]:font-normal!',
          '[&_.ant-table-thead_th]:text-[#8C8C8C]!',
          '[&_.ant-table-thead_th]:uppercase',
          '[&_.ant-table-thead_th]:tracking-[0.05em]',
          '[&_.ant-table-tbody > tr:last-child > td]:border-b-0',
          '[&_.ant-table-thead > tr > th]:border-b-0',
          '[&_.ant-table-expand-icon-col]:w-0',
          '[&_.ant-table-expand-icon-col]:hidden',
          styles.circuitTable
        )}
        style={{ '--ant-table-expand-icon-col-width': '0px' } as React.CSSProperties}
        dataSource={CIRCUITS}
        columns={columns}
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
