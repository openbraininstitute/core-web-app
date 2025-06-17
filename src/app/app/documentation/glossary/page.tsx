'use client';

import { useState } from 'react';

import GlossaryContent from '@/components/documentation/glossary/glossary-content';
import GlossaryFilterBar from '@/components/documentation/glossary/glossary-filter-bar';
import { useSanityContentForGlossary } from '@/components/documentation/hooks/use-sanity-content-for-glossary';
import { ContentForGlossaryItem } from '@/components/documentation/type';
import Slugify from '@/util/slugify';

type FilterLetter = string | null;

export default function FullGlossaryPage() {
  const content: ContentForGlossaryItem[] = useSanityContentForGlossary();

  const [filteredLetter, setFilteredLetter] = useState<FilterLetter>(null);

  // Filter terms based on selected letter
  const filteredTerms: ContentForGlossaryItem[] = filteredLetter
    ? content.filter((term) => term.Name.toUpperCase().startsWith(filteredLetter))
    : content;

  // Handle filter change from GlossaryFilterBar
  const handleFilterChange = (letter: FilterLetter) => {
    setFilteredLetter(letter);
  };

  return (
    <div className="flex w-full flex-col gap-y-10 px-8">
      <GlossaryFilterBar onFilterChange={handleFilterChange} content={content} />
      <div className="flex flex-col gap-y-8">
        {filteredTerms.map((item: ContentForGlossaryItem) => (
          <GlossaryContent key={Slugify(item.Name)} content={item} />
        ))}
      </div>
    </div>
  );
}
