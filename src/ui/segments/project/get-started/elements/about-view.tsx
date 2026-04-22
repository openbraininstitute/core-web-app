'use client';

import { PortableText, type PortableTextBlock } from 'next-sanity';

import { cn } from '@/utils/css-class';

import styles from '@/ui/segments/help/about/about-content.module.css';

export function AboutView({ blocks }: { blocks: PortableTextBlock[] | undefined }) {
  return (
    <div
      className={cn(
        'text-primary-9 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-auto pr-2',
        styles.content
      )}
    >
      {blocks?.length ? (
        <PortableText value={blocks} />
      ) : (
        <p className="text-primary-9/70">No content available.</p>
      )}
    </div>
  );
}

export default AboutView;
