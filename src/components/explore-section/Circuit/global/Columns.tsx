import { Tooltip } from 'antd';
import { ColumnType } from 'antd/es/table';
import Link from 'next/link';
import { Key, SyntheticEvent } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import { CircuitSchemaProps } from '../type';
import formatNumberWithComma from '../utils/format-number-with-comma';
import { FilterConfig } from './state/columns';

import { ChevronRight, DownloadIcon } from '@/components/icons';
import truncateText from '@/util/truncate';
import { classNames } from '@/util/utils';

type ResizableColumnType = ColumnType<CircuitSchemaProps> & {
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
  toggle: 'hierarchical' | 'flat',
  filters: Record<string, FilterConfig | null>,
  searchQuery: string
): ResizableColumnType[] => {
  return [
    {
      title: (
        <Tooltip title="Download files">
          <DownloadIcon className="text-primary-9 h-5 w-auto" />
        </Tooltip>
      ),
      key: 'download',
      width: 80,
      fixed: 'left', // Optional: fixes the column to the left for better visibility
      render: (_value: any, record: CircuitSchemaProps, _index: number) => {
        return (
          <button
            type="button"
            aria-label="Open download modal"
            onClick={() => handleOpenDownloadModal(record)}
          >
            <DownloadIcon className="text-primary-8" />
          </button>
        );
      },
    },
    {
      title: 'Name',
      key: 'name',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => {
        const isFilterActive =
          Object.values(filters).some((f) => f !== null) || searchQuery.trim() !== '';
        const isMatching =
          isFilterActive &&
          ((filters.name?.min &&
            typeof record.name === 'string' &&
            record.name.toLowerCase().includes((filters.name?.min as string)?.toLowerCase())) ||
            (searchQuery.trim() !== '' &&
              typeof record.name === 'string' &&
              record.name.toLowerCase().includes(searchQuery.toLowerCase())));
        const href = isCircuitDetailPage ? `./${record.key}` : `./circuit/${record.key}`;
        return (
          <Link
            href={href}
            className={classNames(
              'whitespace-nowrap',
              toggle === 'hierarchical' && isMatching ? 'font-bold' : ''
            )}
          >
            {record.name}
          </Link>
        );
      },
    },
    {
      title: 'Subcircuits',
      key: 'subcircuits',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, index: number) => {
        const isExpanded = Array.isArray(expandedRowKeys) && expandedRowKeys.includes(record.key);
        const totalSubcircuitsForParent = calculateSubcircuitsForParent(record);
        const subcircuitCount = totalSubcircuitsForParent > 0 ? totalSubcircuitsForParent : '–';

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
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <Tooltip title={record.description}>
          <div className="font-normal text-ellipsis whitespace-nowrap">
            {truncateText(record.description, 46)}
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">{record.brainRegion}</div>
      ),
    },
    {
      title: 'Scale',
      key: 'scale',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => {
        const content = [
          {
            label: 'Small microcircuit',
            value: 'smallMicrocircuit',
            description:
              'Circuit with 3-20 neurons together with synapses coming from inside and outside its volume (usually called intrinsic and extrinsic synapses respectively).',
          },
          {
            label: 'Microcircuit',
            value: 'microcircuit',
            description:
              'Any circuit larger than 20 neurons but not being a region, system, or whole-brain circuit.',
          },
        ];
        const scaleInfo = content.find(
          (item) => item.value === (record.scale?.toLowerCase() || '')
        );
        return (
          <Tooltip title={scaleInfo?.description || ''}>
            <div className="font-normal whitespace-nowrap capitalize">
              {record.scale || 'Unknown'}
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">
          {formatNumberWithComma(record.numberOfNeurons)}
        </div>
      ),
    },
    {
      title: '# Connections',
      key: 'numberOfConnections',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">
          {formatNumberWithComma(record.numberOfConnections)}
        </div>
      ),
    },
    {
      title: '# Synapses',
      key: 'numberOfSynapses',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">
          {formatNumberWithComma(record.numberOfSynapses)}
        </div>
      ),
    },
    {
      title: 'Species',
      key: 'specie',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">{record.species}</div>
      ),
    },
    {
      title: 'Published In',
      key: 'publishedIn',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">{record.metadata.publishedIn}</div>
      ),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">{record.metadata.registrationDate}</div>
      ),
    },
    {
      title: 'Build category',
      key: 'buildCategory',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="font-normal whitespace-nowrap">{record.buildCategory}</div>
      ),
    },
  ];
};

export default columns;
