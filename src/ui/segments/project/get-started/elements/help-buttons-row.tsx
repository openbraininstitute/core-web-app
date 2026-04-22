'use client';

import { RiBookOpenLine, RiInformationLine } from '@remixicon/react';
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
};

const ITEMS: Array<Item> = [
  { id: 'about', label: 'About', Icon: RiInformationLine },
  { id: 'glossary', label: 'Glossary', Icon: RiBookOpenLine },
];

export function HelpButtonsRow() {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const setPreview = useSetAtom(dataPreviewAtom);

  return (
    <section id="help-quick-links" className="flex w-full flex-col">
      <h2 className="text-primary-9 mb-2 text-xl font-bold">Help</h2>
      <div className="flex gap-1.5">
        {ITEMS.map(({ id, label, Icon }) => {
          const isSelected = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => {
                setPreview(null);
                setView(isSelected ? null : id);
              }}
              title={label}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex aspect-square w-28 shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-2 overflow-hidden rounded-xl bg-white',
                'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] hover:shadow-bnb',
                'border-2 transition-colors',
                isSelected ? 'border-primary-7' : 'border-transparent'
              )}
            >
              <Icon className="text-primary-9 size-7" />
              <span className="text-primary-9 text-sm font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default HelpButtonsRow;
