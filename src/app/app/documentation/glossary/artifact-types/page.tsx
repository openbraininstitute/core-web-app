'use client';

import ItemCard from '@/components/documentation/global/item-card';
import { useSanityContentForArtifactTypes } from '@/components/documentation/hooks/use-sanity-content-for-artifact-types';
import { ContentForGlossaryItem } from '@/components/documentation/type';

export default function DataTypesPage() {
  const artifactTypeslContent = useSanityContentForArtifactTypes().sort((a, b) =>
    a.Name.localeCompare(b.Name)
  );

  return (
    <div className="flex w-full flex-row">
      <div className="relative ml-24 w-full">
        <h1 className="text-primary-3 mb-4 block text-xl font-bold">Artifact Types</h1>
        <div className="flex flex-col gap-y-4 text-white">
          {artifactTypeslContent.length > 0 ? (
            artifactTypeslContent.map((item: ContentForGlossaryItem) => (
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
