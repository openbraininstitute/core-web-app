'use client';

import { PortableText, type PortableTextBlock } from 'next-sanity';

import { cn } from '@/utils/css-class';

import styles from '@/ui/segments/help/about/about-content.module.css';

const YEAR_PREFIX = /^\s*2025:\s*/;

function transformFirstHeading(
  blocks: PortableTextBlock[],
  override?: string
): PortableTextBlock[] {
  let transformed = false;
  return blocks.map((block) => {
    if (transformed) return block;
    const children = (block as { children?: Array<{ _type?: string; text?: string }> }).children;
    if (!Array.isArray(children)) return block;
    const firstSpanIdx = children.findIndex(
      (child) => child?._type === 'span' && typeof child.text === 'string'
    );
    if (firstSpanIdx === -1) return block;
    const original = children[firstSpanIdx].text ?? '';
    const stripped = original.replace(YEAR_PREFIX, '');
    const next = override ?? stripped;
    if (next === original) return block;
    transformed = true;
    const nextChildren = children.map((child, idx) =>
      idx === firstSpanIdx ? { ...child, text: next } : child
    );
    return { ...block, children: nextChildren } as PortableTextBlock;
  });
}

export function AboutView({
  blocks,
  titleOverride,
}: {
  blocks: PortableTextBlock[] | undefined;
  titleOverride?: string;
}) {
  const cleaned = blocks?.length ? transformFirstHeading(blocks, titleOverride) : blocks;
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
