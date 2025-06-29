'use client';

import { Metadata } from 'next';
import { useState } from 'react';

import GlossaryContent from '@/components/documentation/glossary/glossary-content';
import GlossaryFilterBar from '@/components/documentation/glossary/glossary-filter-bar';
import { useSanityContentForGlossary } from '@/components/documentation/hooks/use-sanity-content-for-glossary';
import { ContentForGlossaryItem } from '@/components/documentation/type';
import Slugify from '@/util/slugify';

type FilterLetter = string | null;

export const metadata: Metadata = {
  title: 'Open Brain Platform Glossary',
  description: 'Explore the glossary definitions in our documentation.',
};

export default function GlossaryFullContent() {
  const content: ContentForGlossaryItem[] = useSanityContentForGlossary();

  const [filteredLetter, setFilteredLetter] = useState<FilterLetter>(null);

  const filteredTerms: ContentForGlossaryItem[] = filteredLetter
    ? content.filter((term) => term.Name.toUpperCase().startsWith(filteredLetter))
    : content;

  const sortedTerms = [...filteredTerms].sort((a, b) => a.Name.localeCompare(b.Name));

  const handleFilterChange = (letter: FilterLetter) => {
    setFilteredLetter(letter);
  };

  return (
    <div className="flex w-full flex-col gap-y-10 px-8">
      <GlossaryFilterBar onFilterChange={handleFilterChange} content={content} />
      <div className="flex flex-col gap-y-8">
        {sortedTerms.map((item: ContentForGlossaryItem) => (
          <GlossaryContent key={Slugify(item.Name)} content={item} />
        ))}
      </div>
    </div>
  );
}
