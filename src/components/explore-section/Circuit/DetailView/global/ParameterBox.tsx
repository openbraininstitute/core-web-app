'use client';

import Link from 'next/link';
import type { DetailedHTMLProps, HTMLAttributes } from 'react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

import { CloseIcon } from '@/components/icons';

function MarkdownParagraph(
  props: DetailedHTMLProps<HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>
) {
  const { children, className } = props;
  return <p className={`mb-4${className ? ` ${className}` : ''}`}>{children}</p>;
}

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
    <div className="relative flex w-full flex-col">
      <div className="text-sm font-light tracking-wider text-gray-500 uppercase">{name}</div>
      {link && (
        <Link
          href={link ?? ''}
          className="text-primary-9 text-xl leading-normal font-normal break-all"
        >
          {value}
        </Link>
      )}
      {!link && hasViewMore && (
        <div>
          <p className="text-primary-9 line-clamp-2 overflow-hidden text-xl leading-normal font-normal text-ellipsis">
            {value}
          </p>
          <button
            type="button"
            aria-label="View more"
            className="text-primary-9 mt-2 rounded-full border border-solid border-gray-300 bg-white px-4 py-2 text-sm font-normal"
            onClick={() => setViewMore(true)}
          >
            View more
          </button>
        </div>
      )}
      {!link && !hasViewMore && (
        <div className="text-primary-9 text-xl leading-normal font-normal">
          <ReactMarkdown
            className="prose"
            components={{
              p: MarkdownParagraph,
            }}
          >
            {String(value)}
          </ReactMarkdown>
        </div>
      )}

      {viewMore && (
        <div className="fixed top-0 left-0 z-50 flex h-screen w-screen items-center justify-center bg-black/60">
          <div className="text-primary-9 flex w-2/3 flex-col rounded-md bg-white p-10">
            <div className="mb-2 flex flex-row justify-between">
              <div className="text-xl font-bold">{name}</div>
              <button
                type="button"
                aria-label="Close view more modal"
                onClick={() => setViewMore(false)}
              >
                <CloseIcon className="text-primary-9 h-4 w-4" />
              </button>
            </div>
            <p className="text-lg leading-normal font-normal">{value}</p>
          </div>
        </div>
      )}
    </div>
  );
}
