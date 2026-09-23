'use client';

import { MarkdownDescription } from '@/ui/molecules/markdown-description';

type Props = {
  title: string;
  description: string;
};

/**
 * Title + description header for the bespoke E-Model optimisation sections, styled to match the
 * schema-driven `Block` component (uppercase gray title, markdown description).
 */
export function SectionHeader({ title, description }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-lg text-gray-500 uppercase wrap-break-word">{title}</div>
      <MarkdownDescription className="mb-4 text-gray-500">{description}</MarkdownDescription>
    </div>
  );
}
