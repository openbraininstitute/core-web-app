import { ColumnsType } from 'antd/es/table';
import Link from 'next/link';
import { Key, SyntheticEvent } from 'react';
import { ResizeCallbackData } from 'react-resizable';

import { CircuitSchemaProps } from '../type';

import { ChevronRight } from '@/components/icons';
import truncate from '@/util/truncate';
import { classNames } from '@/util/utils';

export type ResizableColumnType = ColumnsType<CircuitSchemaProps>[number] & {
  onHeaderCell?: (column: ResizableColumnType) => React.HTMLAttributes<HTMLElement> & {
    onResize: (e: SyntheticEvent, data: ResizeCallbackData) => void;
  };
};

const columns = (
  expandedRowKeys: Key | Key[],
  calculateSubcircuitsForParent: (row: CircuitSchemaProps) => number,
  handleExpandRow: (row: CircuitSchemaProps, index: number) => void,
  handleResize: (key: string) => (e: SyntheticEvent, data: ResizeCallbackData) => void
): ResizableColumnType[] => [
  {
    title: 'Name',
    key: 'name',
    width: 150,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap">
        {record.name}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Description',
    key: 'description',
    width: 300,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {truncate(record.description, 40)}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Brain region',
    key: 'brainRegion',
    width: 150,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {record.brainRegion}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: '# Neurons',
    key: 'numberOfNeurons',
    width: 130,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {record.numberOfNeurons}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Species',
    key: 'specie',
    width: 120,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {record.species}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Contributor',
    key: 'contributorSimple',
    width: 150,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {record.metadata.contributorSimple}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Registration date',
    key: 'registrationDate',
    width: 150,
    render: (_value: any, record: CircuitSchemaProps, _index: number) => (
      <Link href={`./circuit/${record.key}`} className="whitespace-nowrap font-normal">
        {record.metadata.registrationDate}
      </Link>
    ),
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
  {
    title: 'Subcircuits',
    key: 'hasSubcircuits',
    width: 120,
    render: (_value: any, record: CircuitSchemaProps, index: number) => {
      const isExpanded = Array.isArray(expandedRowKeys) && expandedRowKeys.includes(record.key);
      const totalSubcircuitsForParent = calculateSubcircuitsForParent(record);

      return (
        record.hasSubcircuits && (
          <button
            type="button"
            className="relative flex h-6 items-center justify-center text-base font-normal focus:outline-none"
            aria-label="Open subcircuit"
            onClick={() => handleExpandRow(record, index)}
            disabled={!record.hasSubcircuits}
          >
            <div className="relative mr-6 block">{totalSubcircuitsForParent}</div>
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
    onHeaderCell: (column) => ({
      width: column.width ?? 150,
      onResize: handleResize(column.key as string),
    }),
  },
];

export default columns;
