import { ContentForGlossaryItem } from '../hooks/use-sanity-content-for-glossary';

import { classNames } from '@/util/utils';

export default function GlossaryTableOfContent({
  content,
  activeItem,
  setActiveItem,
}: {
  content: ContentForGlossaryItem[];
  activeItem: ContentForGlossaryItem | null;
  setActiveItem: (item: ContentForGlossaryItem | null) => void;
}) {
  return (
    <div className="w-[255px] pt-[112px]">
      <div className="mb-2 text-xl font-bold text-primary-3">Glossary</div>
      <div className="flex flex-col items-start gap-y-2">
        {content.map((item: ContentForGlossaryItem) => (
          <button
            type="button"
            aria-label="Select glossary item"
            onClick={() => setActiveItem(item)}
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
