'use client';

import {
  RiArticleLine,
  RiBookOpenLine,
  RiFileTextLine,
  RiInformationLine,
  RiNewspaperLine,
  RiPriceTag3Line,
  RiSparklingLine,
} from '@remixicon/react';
import { useAtom } from 'jotai';

import {
  type LeftPaneView,
  leftPaneViewAtom,
} from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { cn } from '@/utils/css-class';

type Item = {
  id: Exclude<LeftPaneView, null>;
  label: string;
  Icon: typeof RiInformationLine;
};

const ITEMS: Array<Item> = [
  { id: 'about', label: 'About', Icon: RiInformationLine },
  { id: 'news', label: 'News', Icon: RiNewspaperLine },
  { id: 'publications', label: 'Publications', Icon: RiArticleLine },
  { id: 'glossary', label: 'Glossary', Icon: RiBookOpenLine },
  { id: 'features', label: 'Features', Icon: RiSparklingLine },
  { id: 'pricing', label: 'Pricing', Icon: RiPriceTag3Line },
  { id: 'terms', label: 'T&Cs', Icon: RiFileTextLine },
];

export function HelpButtonsRow() {
  const [view, setView] = useAtom(leftPaneViewAtom);

  return (
    <section id="help-quick-links" className="flex w-full flex-col">
      <div className="flex w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ id, label, Icon }) => {
          const isSelected = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setView(isSelected ? null : id)}
              title={label}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex aspect-square h-[68px] w-[68px] shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-[3px] overflow-hidden rounded-lg bg-white',
                'border-2 transition-colors',
                isSelected ? 'border-primary-7' : 'border-transparent'
              )}
            >
              <Icon className="text-primary-9 size-[18px]" />
              <span className="text-primary-9 text-center text-[11px] leading-tight font-semibold">
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default HelpButtonsRow;
