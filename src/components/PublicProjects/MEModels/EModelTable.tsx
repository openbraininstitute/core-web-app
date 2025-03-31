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
      className="my-2 rounded-3xl border border-solid border-primary-9 bg-white px-6 py-2 text-base text-primary-9 transition-colors duration-300 ease-in-out hover:bg-primary-9 hover:text-white"
      download
    >
      Download
    </a>
  );
}

const nameFormating = (str: string, length: number) => {
  let newString = '';

  if (str) {
    newString = str.replace(/_{1,2}/g, ' ');
  }

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
    cell: (info) => nameFormating(info.getValue(), 30),
    size: 300,
  },
  {
    accessorKey: 'brainRegion',
    header: 'Brain Region',
    cell: (info) => nameFormating(info.getValue(), 20),
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
    cell: (info) => nameFormating(info.getValue(), 30),
    size: 100,
  },
  {
    accessorKey: 'contributor',
    header: 'Contributor',
    cell: (info) => nameFormating(info.getValue(), 30),
    size: 100,
  },
  {
    accessorKey: 'creationDate',
    header: 'Creation Date',
    cell: (info) => info.getValue(),
    size: 100,
  },
];

export default function EModelTable({ content }: { content: MinimalMeModelProps[] }) {
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
                  className="cursor-pointer p-2 text-left text-sm font-normal uppercase tracking-wide text-neutral-4"
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
                <td key={cell.id} className="whitespace-nowrap p-5">
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
