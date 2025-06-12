'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ContentForGlossaryItem } from '../hooks/use-sanity-content-for-glossary';

import { classNames } from '@/util/utils';
import { useEffect } from 'react';

export default function GlossaryTableOfContent({
  content,
  activeItem,
  setActiveItem,
}: {
  content: ContentForGlossaryItem[];
  activeItem: ContentForGlossaryItem | null;
  setActiveItem: (item: ContentForGlossaryItem | null) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleItemClick = (item: ContentForGlossaryItem) => {
    setActiveItem(item);
    const encodedItemName = encodeURIComponent(item.Name);
    router.push(`/app/documentation/glossary?item=${encodedItemName}`);
  };

  useEffect(() => {
    const itemName = searchParams.get('item');
    if (itemName) {
      const decodedItemName = decodeURIComponent(itemName);
      const matchingItem = content.find((item) => item.Name === decodedItemName);
      if (matchingItem && matchingItem !== activeItem) {
        setActiveItem(matchingItem);
      } else if (!matchingItem && activeItem) {
        // Clear activeItem if query parameter is invalid
        setActiveItem(null);
      }
    } else if (activeItem) {
      // Clear activeItem if no query parameter
      setActiveItem(null);
    }
  }, [content, searchParams, setActiveItem, activeItem]);

  return (
    <div className="w-[255px]">
      <div className="mb-2 text-xl font-bold text-primary-3">Glossary</div>
      <div className="flex flex-col items-start gap-y-2">
        {content.map((item: ContentForGlossaryItem) => (
          <button
            type="button"
            aria-label="Select glossary item"
            onClick={() => handleItemClick(item)}
            key={item.Name}
            className={classNames(
              'text-base',
              activeItem?.Name === item.Name ? 'font-bold text-white' : 'font-normal text-primary-2'
            )}
          >
            {item.Name}
          </button>
        ))}
      </div>
    </div>
  );
}
