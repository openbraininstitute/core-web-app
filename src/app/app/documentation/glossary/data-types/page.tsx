'use client';

import ItemCard from '@/components/documentation/global/item-card';
import { useSanityContentForExperimentsModels } from '@/components/documentation/hooks/use-sanity-content-for-data-type';
import type { ContentForGlossaryItem } from '@/components/documentation/type';

export default function DataTypesPage() {
  const experimentAndModelContent = useSanityContentForExperimentsModels();

  return (
    <div className="flex w-full flex-row">
      <div className="relative ml-24 w-full">
        <h1 className="text-primary-3 mb-4 block text-xl font-bold">Data Types</h1>
        <div className="flex flex-col gap-y-4 text-white">
          {experimentAndModelContent.length > 0 ? (
            experimentAndModelContent.map((item: ContentForGlossaryItem) => (
              <ItemCard content={item} key={item.Name} />
            ))
          ) : (
            <p>No experiment or model data available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
