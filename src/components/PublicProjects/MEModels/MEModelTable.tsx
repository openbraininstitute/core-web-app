'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MEModelsProps } from '../type';

const shorterName = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength) + '...';
};

export type Column = {
  accessorKey: string;
  header: string;
  cell: (info: { getValue: () => any }) => any;
  size: number;
};

const columns: Column[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: (info) => shorterName(info.getValue(), 40),
    size: 350,
  },
  {
    accessorKey: 'morphology',
    header: 'Morphology',
    cell: ({ getValue }) => (
      <Image
        src={getValue()}
        alt="Image of morphology"
        width={100}
        height={100}
        className="h-auto w-full"
      />
    ),
    size: 116,
  },
  {
    accessorKey: 'trace',
    header: 'Trace',
    cell: ({ getValue }) => (
      <Image
        src={getValue()}
        alt="Image of trace"
        width={100}
        height={100}
        className="h-auto w-full"
      />
    ),
    size: 116,
  },
  {
    accessorKey: 'validated',
    header: 'Validated',
    cell: (info) => (info.getValue() === true ? 'True' : 'False'),
    size: 96,
  },
  {
    accessorKey: 'brainRegion',
    header: 'Brain Region',
    cell: (info) => info.getValue(),
    size: 200,
  },
  {
    accessorKey: 'mType',
    header: 'M Type',
    cell: (info) => info.getValue(),
    size: 112,
  },
  {
    accessorKey: 'eType',
    header: 'E Type',
    cell: (info) => info.getValue(),
    size: 112,
  },
];

export default function MEModelTable({ content }: { content: MEModelsProps[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const router = useRouter();

  const table = useReactTable({
    data: content,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const onClickRow = (link: string) => {
    router.push(link);
  };

  return (
    <div className="relative w-full">
      <table className="w-full border-collapse gap-y-12">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="cursor-pointer p-2 text-left font-normal uppercase tracking-wide text-neutral-4"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{
                    asc: ' ↑',
                    desc: ' ↓',
                  }[header.column.getIsSorted() as string] ?? null}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="mt-24">
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-b bg-white transition-colors duration-500 ease-out hover:bg-neutral-1"
              onClick={() => onClickRow(row.original.url)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="p-2">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
