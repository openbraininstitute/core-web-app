import { Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import Link from 'next/link';
import { Key, SyntheticEvent } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import { CircuitSchemaProps } from '../type';
import formatNumberWithComma from '../utils/format-number-with-comma';

import { ChevronRight, DownloadIcon } from '@/components/icons';
import { classNames } from '@/util/utils';

export type ResizableColumnType = ColumnType<CircuitSchemaProps> & {
  onHeaderCell?: (column: ColumnType<CircuitSchemaProps>) => React.HTMLAttributes<HTMLElement> & {
    width: number;
    onResize: (e: SyntheticEvent, data: ResizeCallbackData) => void;
  };
};

const columns = (
  expandedRowKeys: Key | Key[],
  calculateSubcircuitsForParent: (row: CircuitSchemaProps) => number,
  handleExpandRow: (row: CircuitSchemaProps, index: number) => void,
  isCircuitDetailPage: boolean,
  handleOpenDownloadModal: (record: CircuitSchemaProps) => void,
  toggle: 'hierarchical' | 'flat'
): ResizableColumnType[] => {
  return [
    {
      title: (
        <Tooltip title="Download files">
          <DownloadIcon iconColor="#A2A2A2" />
        </Tooltip>
      ),
      key: 'download',
      width: 80,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => {
        return (
          <button
            type="button"
            aria-label="Open download modal"
            onClick={() => handleOpenDownloadModal(record)}
          >
            <DownloadIcon iconColor="#003A8C" />
          </button>
        );
      },
    },
    {
      title: 'Name',
      key: 'name',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => {
        const href = isCircuitDetailPage ? `./${record.key}` : `./circuit/${record.key}`;
        return (
          <Link href={href} className="whitespace-nowrap">
            {record.name}
          </Link>
        );
      },
    },
    {
      title: 'Subcircuits',
      key: 'hasSubcircuits',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, index: number) => {
        const isExpanded = Array.isArray(expandedRowKeys) && expandedRowKeys.includes(record.key);
        const totalSubcircuitsForParent = calculateSubcircuitsForParent(record);
        const subcircuitCount =
          (record.subcircuits?.length ?? 0) > 0 ? totalSubcircuitsForParent : '–';

        return (
          <button
            type="button"
            className="relative flex h-6 items-center justify-center rounded-full border-none border-gray-100 text-base font-normal focus:outline-none"
            aria-label="Open subcircuit"
            onClick={() => handleExpandRow(record, index)}
            disabled={!record.hasSubcircuits}
          >
            <div className="relative mr-6 block whitespace-nowrap">{subcircuitCount}</div>
            {record.subcircuits?.length !== 0 && toggle === 'hierarchical' && (
              <ChevronRight
                fill="#003A8C"
                className={classNames(
                  'relative top-px h-4 w-auto transition-transform duration-300 ease-in-out',
                  isExpanded ? 'rotate-90' : 'rotate-0'
                )}
              />
            )}
          </button>
        );
      },
    },
    {
      title: 'Description',
      key: 'description',
      width: 200,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="text-ellipsis whitespace-nowrap font-normal">{record.description}</div>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.brainRegion}</div>
      ),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">
          {formatNumberWithComma(record.numberOfNeurons)}
        </div>
      ),
    },
    {
      title: '# Connections',
      key: 'numberOfConnections',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">
          {formatNumberWithComma(record.numberOfConnections)}
        </div>
      ),
    },
    {
      title: '# Synapses',
      key: 'numberOfSynapses',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">
          {formatNumberWithComma(record.numberOfSynapses)}
        </div>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.species}</div>
      ),
    },
    {
      title: 'Contributor',
      key: 'contributorSimple',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.metadata.contributorSimple}</div>
      ),
    },
    {
      title: 'Published in',
      key: 'publishedIn',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.metadata.publishedIn}</div>
      ),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.metadata.registrationDate}</div>
      ),
    },
  ];
};

export default columns;
