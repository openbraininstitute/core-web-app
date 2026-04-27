'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import Slugify from '@/util/slugify';
import { cn } from '@/utils/css-class';

import type { CellTypeContentForGlossaryItem, ContentForGlossaryItem } from '@/types/help/type';
import type { CellTypeContentProps } from '@/ui/segments/help/glossary';

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
    <div className="flex w-full flex-col gap-y-6">
      {glossarySectionsTypes.map((section: GlossarySectionType) => (
        <div key={section.name} className="flex flex-col gap-y-2">
          <h3 className="text-primary-9 text-xs font-bold tracking-wide uppercase">
            {section.name}
          </h3>
          <div className="flex flex-col gap-y-1.5">
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
                    'text-primary-9 flex w-full items-center justify-between text-left text-sm',
                    isChildActive && 'font-bold'
                  )}
                >
                  {displayName}
                  {isChildActive && <span className="bg-primary-9 h-2 w-2 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
