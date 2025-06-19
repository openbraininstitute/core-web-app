'use client';

import { PortableText } from 'next-sanity';

import { ContentForGlossaryItem } from '@/components/documentation/type';

import styles from './glossary-content.module.css';

export default function GlossaryContent({ content }: { content: ContentForGlossaryItem | null }) {
  return (
    <div className="w-full text-white">
      <header className="mb-4">
        <h1 className="mb-3 text-3xl font-bold">{content?.Name}</h1>
        <div className="border-primary-6 flex flex-row gap-x-4 border-y border-solid py-3">
          <div className="flex flex-row gap-y-2">
            <span className="text-primary-3 mr-1 block">Scale:</span>
            <span>{content?.Scale}</span>
          </div>
          <div className="flex flex-row gap-y-2">
            <span className="text-primary-3 mr-1 block">Data Type:</span>
            <span>{content?.Data_Type}</span>
          </div>
        </div>
      </header>
      {/* <RichContentBloc content={content?.Description || ''} /> */}
      <div className={styles.contentBlock}>
        <PortableText value={content?.definition ?? []} />
      </div>
    </div>
  );
}
