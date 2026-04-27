'use client';

import {
  RiBookOpenLine,
  RiFileTextLine,
  RiInformationLine,
  RiNewspaperLine,
  RiPriceTag3Line,
} from '@remixicon/react';
import { useAtom, useSetAtom } from 'jotai';

import { dataPreviewAtom } from '@/ui/segments/project/get-started/elements/data-preview-atom';
import {
  type LeftPaneView,
  leftPaneViewAtom,
} from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { cn } from '@/utils/css-class';

type Item = {
  id: Exclude<LeftPaneView, null>;
  label: string;
  Icon: typeof RiInformationLine;
  represents?: ReadonlyArray<Exclude<LeftPaneView, null>>;
  wide?: boolean;
};

const ITEMS: Array<Item> = [
  { id: 'about', label: 'About', Icon: RiInformationLine },
  {
    id: 'glossary',
    label: 'Glossary and Features',
    Icon: RiBookOpenLine,
    represents: ['glossary', 'features'],
    wide: true,
  },
  { id: 'news', label: 'News', Icon: RiNewspaperLine },
  { id: 'pricing', label: 'Pricing', Icon: RiPriceTag3Line },
  { id: 'terms', label: 'T&Cs', Icon: RiFileTextLine },
];

export function HelpButtonsRow() {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const setPreview = useSetAtom(dataPreviewAtom);

  return (
    <section id="help-quick-links" className="flex w-full flex-col">
      <div className="flex w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {ITEMS.map(({ id, label, Icon, represents, wide }) => {
          const isSelected = represents ? view !== null && represents.includes(view) : view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPreview(null);
                setView(id);
              }}
              title={label}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex h-[56px] shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-[3px] overflow-hidden rounded-lg bg-white',
                wide ? 'w-[100px] px-1' : 'aspect-square w-[56px]',
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
