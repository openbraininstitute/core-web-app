'use client';

import { useState } from 'react';

import AlphabeticalFilter from '@/components/documentation/global/AlphabeticalFilter';
import ItemCard from '@/components/documentation/global/item-card';
import { useSanityContentForArtifactTypes } from '@/components/documentation/hooks/use-sanity-content-for-artifact-types';
import type { ContentForGlossaryItem } from '@/components/documentation/type';

export default function DataTypesPage() {
  const artifactTypesContent = useSanityContentForArtifactTypes();
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null);

  const filteredContent = selectedLetter
    ? artifactTypesContent.filter(
        (item: ContentForGlossaryItem) => item.Name.charAt(0).toUpperCase() === selectedLetter,
      )
    : artifactTypesContent;

  return (
    <div className="flex max-w-3/4 flex-row">
      <div className="relative ml-24 w-full">
        <h1 className="text-primary-3 mb-4 block text-xl font-bold">Artifact Types</h1>
        <AlphabeticalFilter
          data={artifactTypesContent}
          selectedLetter={selectedLetter}
          setSelectedLetter={setSelectedLetter}
          labelKey="Name"
        />
        <div className="flex flex-col gap-y-4 text-white">
          {filteredContent.length > 0 ? (
            filteredContent.map((item: ContentForGlossaryItem) => (
              <ItemCard content={item} key={item.Name} />
            ))
          ) : (
            <p>No artifact types data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
