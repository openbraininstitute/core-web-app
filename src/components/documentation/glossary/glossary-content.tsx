'use client';

import { useMemo } from 'react';
import RichContentBloc from '../global/rich-content-bloc';
import { ContentForGlossaryItem } from '../hooks/use-sanity-content-for-glossary';

export default function GlossaryContent({
  activeItem,
}: {
  activeItem: ContentForGlossaryItem | null;
}) {
  const processedContent = useMemo(() => {
    if (!activeItem || !activeItem.Description) return '';
    return activeItem.Description.replace(/\n\*\*(.*?)\*\*:/g, '\n- **$1**:');
  }, [activeItem]);

  return (
    <div className="w-full pl-16 text-white">
      <header className="mb-4">
        <h1 className="mb-3 text-3xl font-bold">{activeItem?.Name}</h1>
        <div className="flex flex-row gap-x-4 border-y border-solid border-primary-6 py-3">
          <div className="flex flex-row gap-y-2">
            <span className="mr-1 block text-primary-3">Scale:</span>
            <span>{activeItem?.Scale}</span>
          </div>
          <div className="flex flex-row gap-y-2">
            <span className="mr-1 block text-primary-3">Data Type:</span>
            <span>{activeItem?.Data_Type}</span>
          </div>
        </div>
      </header>
      <RichContentBloc content={processedContent} />
    </div>
  );
}
