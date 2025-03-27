'use client';

import Link from 'next/link';
import { useState } from 'react';

import { SingleFileProps } from '../../content/CIRCUITS_PLACEHOLDER';

import { DownloadIcon } from '@/components/icons';

export type FormatOptionsProps = {
  name: string;
  key: string;
};

export type FormatProps = {
  sonataFile: string;
  connectomeUtilitiesFile: string;
};

export default function DownloadCircuitButton({ formats }: { formats: SingleFileProps[] }) {
  const [displayFormatOptions, setDisplayFormatOptions] = useState<boolean>(false);

  return (
    <div
      className="relative flex w-44 flex-col overflow-hidden transition-height duration-300 ease-in-out"
      style={{}}
    >
      <button
        type="button"
        aria-label="Open download format options"
        className="relative flex h-12 flex-row items-center"
        onClick={() => setDisplayFormatOptions(!displayFormatOptions)}
      >
        <span className="mr-3 block text-base font-normal text-primary-8">Download</span>

        <div className="flex h-12 w-12 items-center justify-center border border-gray-300">
          <DownloadIcon iconColor="#003a8c" className="h-auto w-4" />
        </div>
      </button>

      <div className="absolute left-0 top-0 flex flex-col">
        {formats.map((format: SingleFileProps) => (
          <Link key={format.key} href={format.url}>
            {format.type}
          </Link>
        ))}
      </div>
    </div>
  );
}
