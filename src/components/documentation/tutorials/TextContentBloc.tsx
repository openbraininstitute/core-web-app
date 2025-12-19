'use client';

import { PortableText } from 'next-sanity';
import { useState } from 'react';
import { classNames } from '@/util/utils';
import type { ContentForSingleTutorial } from './fetch-single-tutorial';
import styles from './text-content-bloc.module.css';

export default function TextContentBloc({
  content,
}: {
  content: ContentForSingleTutorial | null | undefined;
}) {
  const [transcriptVisible, setTranscriptVisible] = useState<boolean>(false);

  if (!content) {
    return null;
  }

  return (
    <div className="w-full">
      <button
        type="button"
        aria-label="Show transcript"
        onClick={() => setTranscriptVisible(!transcriptVisible)}
        className="text-primary-9 transition-height bg- flex w-1/3 flex-row items-center justify-between rounded-[60px] border border-solid border-gray-300 px-6 py-4 shadow-2xl duration-300 ease-in-out"
      >
        <h3 className="text-xl font-bold">Transcript</h3>
        <div className="text-base font-normal">
          {transcriptVisible ? (
            <span className="text-primary-8">Hide transcript</span>
          ) : (
            <span className="text-primary-8">View full transcript</span>
          )}
        </div>
      </button>
      <div
        className={classNames(
          styles.transcript,
          'text-primary-9 transition-height overflow-hidden duration-300 ease-in-out',
          transcriptVisible ? 'h-auto' : 'h-0',
        )}
      >
        <PortableText value={content.transcript ?? []} />
      </div>
    </div>
  );
}
