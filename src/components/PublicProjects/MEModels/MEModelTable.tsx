'use client';

import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import Image from 'next/image';

import { useState } from 'react';
import { MEModelsProps } from '../type';

export function DownloadButton({ url }: { url: string }) {
  return (
    <a
      href={url}
      className="my-2 rounded-3xl border border-solid border-primary-9 bg-white px-6 py-2 text-base text-primary-9 transition-colors duration-300 ease-in-out hover:bg-primary-9 hover:text-white"
      download
      target="_blank"
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
    accessorKey: 'species',
    header: 'Species',
    cell: (info) => info.getValue(),
    size: 36,
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
    accessorKey: 'file',
    header: 'File',
    cell: ({ getValue }) => <DownloadButton url={getValue()} />,
    size: 100,
  },
  // {
  //   accessorKey: 'morphologyId',
  //   header: 'Morphology File',
  //   cell: ({ getValue }) => <DownloadButton url={getValue()} />,
  //   size: 112,
  // },
  // {
  //   accessorKey: 'traceFileId',
  //   header: 'Trace File',
  //   cell: ({ getValue }) => <DownloadButton url={getValue()} />,
  //   size: 112,
  // },
  // {
  //   accessorKey: 'morphology',
  //   header: 'Morphology',
  //   cell: ({ getValue }) => (
  //     <Image
  //       src={getValue()}
  //       alt="Image of morphology"
  //       width={100}
  //       height={100}
  //       className="h-auto w-full"
  //     />
  //   ),
  //   size: 116,
  // },
];

export default function MEModelTable({ content }: { content: MEModelsProps[] }) {
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'brainRegion',
      desc: false,
    },
  ]);

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
