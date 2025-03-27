'use client';

import { Key, useState } from 'react';

import { Table } from 'antd';

import CIRCUIT_PLACHOLDER_DATA from '../../../content/CIRCUITS_PLACEHOLDER';
import { ArrowSmall } from '../../../icon/ArrowSubcircuitIcon';

import { CircuitColumn, CircuitSchemaProps } from '../../../type';

import { ChevronRight } from '@/components/icons';
import truncate from '@/util/truncate';
import { classNames } from '@/util/utils';

export default function SubcircuitsList() {
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
        .filter((key) =>
          CIRCUIT_PLACHOLDER_DATA.some((row) => row.key === key && row.hasSubcircuits)
        )
        .map((key) => key as string);

      const subRowKeys = selectedRows
        .flatMap((row) => row.subcircuits?.map((sub: CircuitSchemaProps) => sub.key) || [])
        .filter(Boolean);

      setExpandedRowKeys(updatedExpandedKeys);

      setSelectedRowKeys([...newSelectedRowKeys.map((k) => k as string), ...subRowKeys]);
    },
  };

  const columns: CircuitColumn[] = [
    {
      title: 'Name',
      key: 'name',
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
          {truncate(value.description, 60)}
        </a>
      ),
      width: 200,
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
        <span className="whitespace-nowrap font-normal">{value.specie}</span>
      ),
    },
    {
      title: 'Created by',
      key: 'createdBy',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.createdBy}
        </a>
      ),
    },
    {
      title: 'Creation date',
      key: 'creationDate',
      render: (value: CircuitSchemaProps) => (
        <a href={value.key} className="whitespace-nowrap font-normal">
          {value.metadata.creationDate}
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
              className="relative flex h-6 items-center justify-center text-base font-normal"
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

  const handleFileDownload = (format: string) => {
    const selectedRowKeyObjects = CIRCUIT_PLACHOLDER_DATA.filter((circuit) =>
      selectedRowKeys.includes(circuit.key)
    );

    selectedRowKeyObjects.forEach((circuit: CircuitSchemaProps) => {
      const fileName = circuit.name;
      let url;

      if (circuit === null) return;

      switch (format) {
        case 'sonataFile':
          url = circuit.files?.[0]?.key;
          break;
        case 'connectomeUtilitiesFile':
          url = circuit.files?.[1]?.key;
          break;
        default:
          url = circuit.files?.[0].key;
          break;
      }

      const link = document.createElement('a');

      link.href = url || '';
      link.download = fileName;
      link.target = '_blank';

      link.click();
    });
  };

  return (
    <div className="relative h-full w-full bg-white py-10 text-2xl font-bold text-primary-9">
      <Table
        className={classNames(
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
        dataSource={CIRCUIT_PLACHOLDER_DATA}
        columns={columns}
        pagination={false}
        scroll={{ x: 'max-content' }}
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

      <div
        className="fixed bottom-6 right-24 z-50 flex h-16 w-[400px] flex-row items-center justify-between bg-primary-8 pl-8 transition-bottom duration-300 ease-in-out"
        style={{
          bottom: selectedRowKeys.length > 0 ? '24px' : '-60px',
        }}
      >
        <div className="text-base font-normal text-primary-3">
          Download ({selectedRowKeys.length})
        </div>
        <div className="relative flex h-full flex-row">
          <button
            type="button"
            aria-label="Download sonata circuit"
            className="bg-primary-8 px-5 text-base font-normal text-white transition-colors duration-300 ease-in hover:bg-primary-1 hover:text-primary-8"
            onClick={() => handleFileDownload('sonataFile')}
          >
            Sonata
          </button>
          <button
            type="button"
            aria-label="Download connectome utilities"
            className="bg-primary-8 px-5 text-base font-normal text-white transition-colors duration-300 ease-in hover:bg-primary-1 hover:text-primary-8"
            onClick={() => handleFileDownload('connectomeUtilitiesFile')}
          >
            Connectome utilities
          </button>
        </div>
      </div>
    </div>
  );
}
