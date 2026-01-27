'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import type { CellTypeContentForGlossaryItem, ContentForGlossaryItem } from '@/types/help/type';
import AccordionButton from '@/ui/molecules/dropdown';
import type { CellTypeContentProps } from '@/ui/segments/help/glossary';
import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

export type GlossarySectionType = {
  name: string;
  data: ContentForGlossaryItem[] | CellTypeContentForGlossaryItem[] | CellTypeContentProps[];
};

export default function GlossaryNavigation({
  glossarySectionsTypes,
}: {
  glossarySectionsTypes: GlossarySectionType[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTerm = searchParams.get('term');

  return (
    <div className="flex w-full flex-col gap-y-5">
      <div className="flex flex-col gap-y-2">
        {glossarySectionsTypes.map((section: GlossarySectionType) => {
          const isSectionActive =
            currentTerm &&
            (Slugify(section.name) === currentTerm ||
              section.data.some((item) => {
                const displayName =
                  typeof item === 'object' && 'name' in item
                    ? (item as { name: string }).name
                    : (item as { Name: string }).Name;
                return typeof displayName === 'string' && Slugify(displayName) === currentTerm;
              }));
          return (
            <AccordionButton
              key={section.name}
              label={section.name}
              isActive={!!isSectionActive}
              defaultOpen
            >
              {section.data.map((item) => {
                let displayName = '';
                if ('Name' in item) {
                  displayName = item.Name;
                } else if ('name' in item) {
                  displayName = (item as { name: string }).name;
                }
                const slug = Slugify(displayName);
                const isChildActive = currentTerm === slug;
                return (
                  <button
                    type="button"
                    aria-label={`View glossary definition ${displayName}`}
                    onClick={() => {
                      const url = new URL(window.location.href);
                      url.searchParams.set('term', slug);
                      router.replace(`${url.pathname}${url.search}`, { scroll: false });
                    }}
                    key={displayName}
                    className={cn(
                      'flex w-full items-center justify-between text-left',
                      isChildActive && 'font-bold'
                    )}
                  >
                    {displayName}
                    {isChildActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
                  </button>
                );
              })}
            </AccordionButton>
          );
        })}
      </div>
    </div>
  );
}
