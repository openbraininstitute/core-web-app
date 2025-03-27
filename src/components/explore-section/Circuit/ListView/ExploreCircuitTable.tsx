'use client';

import { Key, useState } from 'react';

import { Table } from 'antd';

import { ArrowSmall } from '../icon/ArrowSubcircuitIcon';

import HARD_CODED_CONTENT from '../content/circuits_tree';
import { CircuitColumn, CircuitSchemaProps } from '../type';

import { TableDownloadButtonLight } from './TableDownloadButton';

import { ChevronRight } from '@/components/icons';
import truncate from '@/util/truncate';
import { classNames } from '@/util/utils';
import styles from './ExploreCircuitTable.module.css';

export default function ExploreCircuitTable() {
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const handleExpandRow = (row: CircuitSchemaProps, _index: number) => {
    if (!row.hasSubcircuits) return;
    const rowKey = row.key;
    setExpandedRowKeys((prev) =>
      prev.includes(rowKey) ? prev.filter((key) => key !== rowKey) : [...prev, rowKey]
    );
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: Key[], selectedRows: CircuitSchemaProps[]) => {
      const updatedExpandedKeys = newSelectedRowKeys
        .filter((key) => HARD_CODED_CONTENT.some((row) => row.key === key && row.hasSubcircuits))
        .map((key) => key as string);

      const subRowKeys = selectedRows
        .flatMap((row) => row.subcircuits?.map((sub) => sub.key) || [])
        .filter(Boolean);

      setExpandedRowKeys(updatedExpandedKeys);

      setSelectedRowKeys([...newSelectedRowKeys.map((k) => k as string), ...subRowKeys]);
    },
  };

  const columns: CircuitColumn[] = [
    {
      title: 'Name',
      key: 'name',
      fixed: 'left',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap">
          {value.name}
        </a>
      ),
    },
    {
      title: 'Description',
      key: 'description',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {truncate(value.description, 40)}
        </a>
      ),
      width: 300,
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.brainRegion}
        </a>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.numberOfNeurons}
        </a>
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
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.contributorSimple}
        </a>
      ),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.registrationDate}
        </a>
      ),
    },
    {
      title: 'Subcircuits',
      key: 'hasSubcircuits',
      render: (value: CircuitSchemaProps, index?: number) => {
        const isExpanded = expandedRowKeys.includes(value.key);

        return (
          value.hasSubcircuits && (
            <button
              type="button"
              className="relative flex h-6 items-center justify-center text-base font-normal focus:outline-none"
              aria-label="Open subcircuit"
              onClick={() => handleExpandRow(value, index ?? -1)}
              disabled={!value.hasSubcircuits}
            >
              <div className="relative mr-6 block ">{value.subcircuits?.length}</div>
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
      <div className="relative flex flex-col pl-[17px]">
        <div className="relative flex flex-row pl-[48px]">
          <ArrowSmall iconColor="#8C8C8C" className="relative -top-0.5" />
          <span className="ml-3 text-base font-semibold uppercase tracking-wider text-[#8C8C8C]">
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
            '[&_.ant-table-expand-icon-col]:hidden'
          )}
          columns={columns}
          dataSource={circuit.subcircuits || []}
          pagination={false}
          rowSelection={{
            selectedRowKeys,
            onChange: (newSelectedRow: Key[], _selectedRow: CircuitSchemaProps[]) => {
              const parentKey = circuit.key;
              const updatedKeys = selectedRowKeys
                .filter(
                  (key) =>
                    !circuit.subcircuits?.find(
                      (subcircuit: CircuitSchemaProps) => subcircuit.key === key
                    )
                )
                .concat(newSelectedRow as string[]);
              if (!updatedKeys.includes(parentKey)) updatedKeys.push(parentKey);
              setSelectedRowKeys(updatedKeys);
            },
          }}
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

  const handleFileDownload = () => {
    const selectedRowKeyObjects = HARD_CODED_CONTENT.filter((circuit) =>
      selectedRowKeys.includes(circuit.key)
    );

    selectedRowKeyObjects.forEach((circuit: CircuitSchemaProps) => {
      const fileName = circuit.name;
      circuit.files.forEach((file) => {
        const { url } = file;

        const link = document.createElement('a');

        link.href = url || '';
        link.download = fileName;
        link.target = '_blank';

        link.click();
      });
    });
  };

  return (
    <div className="relative h-full w-full w-full bg-primary-9 bg-white text-2xl font-bold text-primary-9 text-white">
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
          '[&_.ant-table-expand-icon-col]:hidden'
        )}
        style={{ '--ant-table-expand-icon-col-width': '0px' } as React.CSSProperties}
        dataSource={HARD_CODED_CONTENT}
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

      <TableDownloadButtonLight
        handleFileDownload={handleFileDownload}
        selectedRowKeys={selectedRowKeys}
      />
    </div>
  );
}
