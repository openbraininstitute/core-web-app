'use client';

import { useState } from 'react';

import GlossaryContent from '@/components/documentation/glossary/glossary-content';
import GlossaryTableOfContent from '@/components/documentation/glossary/glossary-table-of-content';
import {
  ContentForGlossaryItem,
  useSanityContentForGlossary,
} from '@/components/documentation/hooks/use-sanity-content-for-glossary';

export default function FullGlossaryPage() {
  const content = useSanityContentForGlossary();

  const [activeItem, setActiveItem] = useState<ContentForGlossaryItem | null>(null);

  return (
    <div className="flex w-full flex-row">
      <GlossaryTableOfContent
        content={content}
        activeItem={activeItem}
        setActiveItem={setActiveItem}
      />

      <div className="w-full">{activeItem && <GlossaryContent content={activeItem} />}</div>
    </div>
  );
}
