'use client';

import GlossaryTableOfContent from '@/components/documentation/glossary/glossary-table-of-content';
import { useSanityContentForGlossary } from '@/components/documentation/hooks/use-sanity-content-for-glossary';

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  const content = useSanityContentForGlossary();
  return (
    <div className="flex w-full flex-row">
      <GlossaryTableOfContent content={content} />
      <div className="relative ml-[200px] w-full pl-20">{children}</div>
    </div>
  );
}
