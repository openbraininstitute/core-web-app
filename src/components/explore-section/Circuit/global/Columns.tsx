import { ColumnType } from 'antd/es/table';
import Link from 'next/link';
import { Key, SyntheticEvent } from 'react';
import { ResizeCallbackData } from 'react-resizable';
import { CircuitSchemaProps } from '../type';

import { ChevronRight } from '@/components/icons';
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
  handleResize: (key: string) => (e: SyntheticEvent, data: ResizeCallbackData) => void,
  isCircuitDetailPage: boolean
): ResizableColumnType[] => {
  return [
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
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
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
            {record.subcircuits?.length !== 0 && (
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
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 120,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: 'Description',
      key: 'description',
      width: 200,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="text-ellipsis whitespace-nowrap font-normal">{record.description}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 200,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: 'Brain region',
      key: 'brainRegion',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.brainRegion}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: '# Neurons',
      key: 'numberOfNeurons',
      width: 130,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.numberOfNeurons}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: 'Species',
      key: 'specie',
      width: 120,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.species}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: 'Contributor',
      key: 'contributorSimple',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.metadata.contributorSimple}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
    },
    {
      title: 'Registration date',
      key: 'registrationDate',
      width: 150,
      render: (_value: any, record: CircuitSchemaProps, _index: number) => (
        <div className="whitespace-nowrap font-normal">{record.metadata.registrationDate}</div>
      ),
      onHeaderCell: (column: ColumnType<CircuitSchemaProps>) => ({
        width: typeof column.width === 'number' ? column.width : 150,
        onResize: handleResize(column.key as string) as any,
      }),
    },
  ];
};

export default columns;
