'use client';

import { RiPlayMiniFill } from '@remixicon/react';
import { useState } from 'react';
import { cn } from '@/utils/css-class';

export default function VideoBlocks({
  title,
  value,
}: {
  title: string;
  value: {
    url: string;
  };
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className={cn(
        'my-4 overflow-hidden rounded-lg border border-neutral-200 transition-width duration-500 ease-in-out',
        isOpen ? 'w-full' : 'w-1/2'
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 bg-neutral-50 px-4 py-3 text-left transition-colors hover:bg-neutral-100"
        aria-expanded={isOpen}
      >
        <div className="min-w-0 flex-1 truncate font-bold text-xl">{title}</div>
        <RiPlayMiniFill
          className={cn('shrink-0 text-lg text-red-500', isOpen && 'rotate-90')}
          aria-hidden
        />
      </button>
      {isOpen && (
        <div className="border-t border-neutral-200 bg-neutral-50 p-4">
          <video className="h-auto w-full rounded-lg" src={value.url} controls title={title}>
            <track kind="captions" src="" />
            Your browser does not support the video tag.
          </video>
        </div>
      )}
    </div>
  );
}
