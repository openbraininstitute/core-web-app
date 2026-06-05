'use client';

import { PortableText, type PortableTextReactComponents } from 'next-sanity';

import ProjectHeader from '@/ui/segments/reports/obi-showcases/project-header/project-header';

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
    <div className="relative">
      <ProjectHeader content={content} />
      <div className={styles.content}>
        <PortableText value={content.description} components={PORTABLE_TEXT_COMPONENTS} />
      </div>
    </div>
  );
}
