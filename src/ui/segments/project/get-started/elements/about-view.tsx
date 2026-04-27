'use client';

import { PortableText, type PortableTextBlock } from 'next-sanity';

import { cn } from '@/utils/css-class';

import styles from '@/ui/segments/help/about/about-content.module.css';

const YEAR_PREFIX = /^\s*2025:\s*/;

function stripYearPrefix(blocks: PortableTextBlock[]): PortableTextBlock[] {
  let stripped = false;
  return blocks.map((block) => {
    if (stripped) return block;
    const children = (block as { children?: Array<{ _type?: string; text?: string }> }).children;
    if (!Array.isArray(children)) return block;
    const firstSpanIdx = children.findIndex(
      (child) => child?._type === 'span' && typeof child.text === 'string'
    );
    if (firstSpanIdx === -1) return block;
    const original = children[firstSpanIdx].text ?? '';
    if (!YEAR_PREFIX.test(original)) return block;
    stripped = true;
    const nextChildren = children.map((child, idx) =>
      idx === firstSpanIdx ? { ...child, text: original.replace(YEAR_PREFIX, '') } : child
    );
    return { ...block, children: nextChildren } as PortableTextBlock;
  });
}

export function AboutView({ blocks }: { blocks: PortableTextBlock[] | undefined }) {
  const cleaned = blocks?.length ? stripYearPrefix(blocks) : blocks;
  return (
    <div
      className={cn(
        'text-primary-9 border-neutral-2 flex max-h-[82vh] w-full flex-col items-start gap-y-4 overflow-y-auto rounded-2xl border bg-transparent p-4',
        styles.content
      )}
    >
      {cleaned?.length ? (
        <PortableText value={cleaned} />
      ) : (
        <p className="text-primary-9/70">No content available.</p>
      )}
    </div>
  );
}

export default AboutView;
