'use client';

import Link from 'next/link';
import { useState } from 'react';

import { PaperLiteratureProps } from '../../../type';

import { CheckIcon, LinkIcon, UserIcon } from '@/components/icons';
import CalendarIcon from '@/components/icons/Calendar';
import CopyIcon from '@/components/icons/CopyIcon';
import { classNames } from '@/util/utils';

export default function PublicationCard({
  content,
  index,
}: {
  content: PaperLiteratureProps;
  index: number;
}) {
  const { abstract } = content;

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [showPopup, setShowPopup] = useState<boolean>(false);

  const copyDOI = () => {
    navigator.clipboard.writeText(content.doi);
    setShowPopup(true);
    setTimeout(() => setShowPopup(false), 2000);
  };

  return (
    <div className="relative flex w-full flex-col">
      {showPopup && (
        <div className="absolute left-[45%] top-0 z-50 flex transform flex-row items-center rounded-md bg-green-700 px-12 py-10 text-xl font-normal text-white">
          <div className="mr-2 flex h-6 w-6 items-center justify-center rounded-full border-none bg-white text-green-700">
            <CheckIcon className="h-auto w-4" />
          </div>
          DOI copied to clipboard
        </div>
      )}
      <header className="relative mb-2 flex w-full flex-row items-start justify-between">
        <div className="relative flex flex-row gap-x-2">
          <div className="relative top-px flex h-6 w-6 items-center justify-center bg-primary-8 text-base text-white">
            {index + 1}
          </div>
          <h3 className="relative flex max-w-[75%] flex-row text-xl font-semibold">
            {content.title}
          </h3>
        </div>
        <div className="flex flex-row gap-x-3">
          {
            content.link !== undefined && (
              <Link
                href={content.link}
                target="_blank"
                className="flex flex-row items-center text-base font-normal text-[#003A8C]"
              >
                <LinkIcon className="mr-2 h-4 w-4" />
                <span>Link</span>
              </Link>
            )
          }
          <button
            type="button"
            onClick={copyDOI}
            className="flex flex-row items-center text-base font-normal text-[#003A8C]"
          >
            <CopyIcon className="mr-2 h-4 w-4" />
            <span className="whitespace-nowrap">Copy DOI</span>
          </button>
        </div>
      </header>

      <div className="relative mb-3 flex w-full flex-row justify-between">
        <div className="relative mr-6 flex w-2/3 flex-row">
          <div className="mr-3 flex h-7 w-7 items-center justify-center rounded-full border border-solid border-gray-300">
            <UserIcon iconColor="#003A8C" className="relative left-px h-3 w-3" />
          </div>

          <div className="relative hyphens-auto text-base font-normal text-[#003A8C]">
            {content.authors}
          </div>
        </div>
        <div className="relative flex flex-row text-primary-9">
          <div className="mr-2 flex h-7 w-7 items-center justify-center rounded-full border border-solid border-gray-300">
            <CalendarIcon className="relative h-3.5 w-3.5" />
          </div>
          <div className="text-base font-normal text-[#003A8C]">{content.publicationDate}</div>
        </div>
      </div>

      <div className="relative flex flex-col items-start">
        <div
          className={classNames(
            'w-full bg-gray-100 p-6',
            isExpanded ? 'max-h-full' : 'max-h-[10em]'
          )}
        >
          <p
            className={`w-full overflow-hidden  text-base leading-normal text-primary-8 transition-all duration-300 ${
              isExpanded ? 'max-h-full' : 'line-clamp-3 max-h-[6.3em]'
            }`}
          >
            {abstract}
          </p>
          <button
            type="button"
            aria-label={isExpanded ? 'Read less' : 'Read more'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-gray-500 underline underline-offset-[6px] hover:underline focus:outline-none"
          >
            {isExpanded ? 'Read Less' : 'Read More'}
          </button>
        </div>
      </div>
    </div>
  );
}