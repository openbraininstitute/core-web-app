'use client';

import { useState } from 'react';

import { PortableText } from 'next-sanity';
import { ChevronRight, ReadMeIcon } from '../icons';
import { NotebooksProps } from './type';

import { classNames } from '@/util/utils';
import styles from './style/notebook.module.css';

export default function SingleNotebook({
  content,
  index,
}: {
  content: NotebooksProps;
  index: number;
}) {
  const [readMeOpen, setReadMeOpen] = useState(false);

  return (
    <div className="relative flex w-full flex-col items-start">
      <header className="text-primary-9 relative flex w-full flex-row items-center justify-between">
        <div className="flex w-full flex-col">
          <div className="after:contents[''] after:bg-primary-9 flex flex-row items-center text-base font-normal after:ml-2 after:block after:h-px after:w-12">
            {index + 1 < 10 ? '0' : ''}
            {index + 1}
          </div>
          <div className="w-full text-3xl leading-[1.3] font-bold hyphens-auto">{content.name}</div>
        </div>
        {content.url && (
          <a
            href={content.url}
            className="border-primary-9 hover:bg-primary-9 border border-solid bg-white px-6 py-3 text-lg whitespace-nowrap transition-colors duration-300 hover:text-white"
            target="_blank"
          >
            View Notebook
          </a>
        )}
      </header>

      <div className="my-3 h-px w-full bg-gray-200" />

      <div className="flex flex-row gap-x-16">
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Scale</div>
          <div className="text-lg">{content.scale}</div>
        </div>
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Object of interest</div>
          <div className="text-lg">{content.objectOfInterest}</div>
        </div>
        <div>
          <div className="text-sm tracking-wider text-gray-400 uppercase">Author(s)</div>
          <div className="text-lg">{content.authors}</div>
        </div>
      </div>
      <div className="my-3 h-px w-full bg-gray-200" />
      <div className="w-full">
        <div>
          <div className="mt-2 text-sm font-normal tracking-wider text-gray-400 uppercase">
            Description
          </div>
          <div className="text-lg leading-normal font-normal">{content.description}</div>
        </div>
        <div className="relative w-full">
          <button
            type="button"
            aria-label="Open read-me block"
            onClick={() => setReadMeOpen(!readMeOpen)}
            className="mt-6 flex w-full flex-row justify-between border border-solid border-gray-200 px-4 py-2"
          >
            <div className="text-primary-9 flex flex-row items-center text-lg font-normal">
              <ReadMeIcon iconColor="#A6A6A6" className="mr-2 h-4 w-auto" />
              Read me
            </div>
            <div>
              <ChevronRight
                fill="#002766"
                className={classNames(
                  'relative top-2 transition-transform duration-300 ease-in-out',
                  readMeOpen ? 'rotate-90' : 'rotate-0'
                )}
              />
            </div>
          </button>
          {readMeOpen && (
            <div className={styles.readMeParagraph}>
              <PortableText value={content.readMe} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
