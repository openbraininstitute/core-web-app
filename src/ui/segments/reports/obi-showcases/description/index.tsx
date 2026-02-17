'use client';

import { PortableText, type PortableTextReactComponents } from 'next-sanity';

import VideoBlocks from '../video-blocks';

import type { SanityShowcaseType } from '@/ui/segments/reports/obi-showcases/types';

import styles from './portable-text.module.css';

function VideoBlockDropdown({ value }: { value: { url?: string; title?: string } }) {
  if (!value?.url) return null;

  const title = value.title ?? 'Video';

  return <VideoBlocks title={title} value={{ url: value.url }} />;
}

const PORTABLE_TEXT_COMPONENTS: Partial<PortableTextReactComponents> = {
  types: {
    videoBlock: ({ value }: { value: { url?: string; title?: string } }) => (
      <VideoBlockDropdown value={value} />
    ),
  },
};

export default function DescriptionSection({ content }: { content: SanityShowcaseType }) {
  return (
    <div className="relative overflow-hidden">
      <div className="relative w-full rounded-lg bg-linear-to-r from-blue-600 to-purple-600 p-8 text-white">
        <h1 className="mb-4 text-4xl font-bold">{content.name}</h1>
        <p className="mb-6 text-xl opacity-90">{content.introduction}</p>

        <div className="flex flex-wrap gap-2">
          <span className="text-xl font-medium opacity-80">Authors:</span>
          {content.authorsList.map((author, index: number) => (
            <span key={`${author.firstName}-${author.lastName}`} className="text-xl">
              {author.firstName} {author.lastName}
              {index < content.authorsList.length - 1 && ', '}
            </span>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        <PortableText value={content.description} components={PORTABLE_TEXT_COMPONENTS} />
      </div>
    </div>
  );
}
