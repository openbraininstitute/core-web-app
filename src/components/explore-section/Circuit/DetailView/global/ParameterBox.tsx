'use client';

import Link from 'next/link';
import { useState } from 'react';

import { CloseIcon } from '@/components/icons';

export default function ParameterBox({
  name,
  value,
  link,
  hasViewMore = false,
}: {
  name: string;
  value: string | number;
  link?: string;
  hasViewMore?: boolean;
}) {
  const [viewMore, setViewMore] = useState<boolean>(false);

  return (
    <div className="relativee flex w-full flex-col">
      <div className="text-sm font-light uppercase tracking-wider text-gray-500">{name}</div>
      {link && (
        <Link href={link ?? ''} className="text-xl font-normal leading-normal text-primary-9">
          {value}
        </Link>
      )}
      {!link && hasViewMore && (
        <div>
          <p className="line-clamp-2 overflow-hidden text-ellipsis text-xl font-normal leading-normal text-primary-9">
            {value}
          </p>
          <button
            type="button"
            aria-label="View more"
            className="mt-2 rounded-full border border-solid border-gray-300 bg-white px-4 py-2 text-sm font-normal text-primary-9"
            onClick={() => setViewMore(true)}
          >
            View more
          </button>
        </div>
      )}
      {!link && !hasViewMore && (
        <div className="text-xl font-normal leading-normal text-primary-9">{value}</div>
      )}

      {viewMore && (
        <div className="fixed left-0 top-0 z-[99999] flex h-screen w-screen items-center justify-center bg-black/60">
          <div className="flex w-2/3 flex-col rounded-md bg-white p-10 text-primary-9">
            <div className="mb-2 flex flex-row justify-between">
              <div className="text-xl font-bold">{name}</div>
              <button
                type="button"
                aria-label="Close view more modal"
                onClick={() => setViewMore(false)}
              >
                <CloseIcon className="h-4 w-4 text-primary-9" />
              </button>
            </div>
            <p className="text-lg font-normal leading-normal">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}
