'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { useState } from 'react';
import { MinimalMeModelProps } from '../type';

export function DownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      className="border-primary-9 text-primary-9 hover:bg-primary-9 my-2 rounded-3xl border border-solid bg-white px-6 py-2 text-base transition-colors duration-300 ease-in-out hover:text-white"
      download
    >
      Download
    </a>
  );
}

const nameFormating = (str: string, length: number) => {
  const newString = str.replace(/_{1,2}/g, ' ');

  if (newString.length <= length) {
    return newString;
  }
  return newString.substring(0, length) + '...';
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
    cell: (info) => nameFormating(info.getValue(), 40),
    size: 250,
  },
  {
    accessorKey: 'brainRegion',
    header: 'Brain Region',
    cell: (info) => nameFormating(info.getValue(), 30),
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
  {
    accessorKey: 'species',
    header: 'Species',
    cell: (info) => info.getValue(),
    size: 100,
  },
];

export default function MinimalMEModelTable({ content }: { content: MinimalMeModelProps[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);

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

  return (
    <div className="relative w-full pb-44">
      <table className="w-full border-collapse gap-y-12">
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="text-neutral-4 cursor-pointer p-2 text-left text-sm font-normal tracking-wide uppercase"
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
            <tr key={row.id} className="cursor-pointer border-b py-2">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="p-5">
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
