'use client';

import {
  RiBookOpenLine,
  RiChatAiLine,
  RiCompass3Line,
  RiFileTextLine,
  RiInformationLine,
  RiSparklingLine,
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
};

const ITEMS: Array<Item> = [
  { id: 'about', label: 'About', Icon: RiInformationLine },
  { id: 'glossary', label: 'Glossary', Icon: RiBookOpenLine },
  { id: 'terms', label: 'Terms', Icon: RiFileTextLine },
  { id: 'guides', label: 'Guides', Icon: RiCompass3Line },
  { id: 'features', label: 'Features', Icon: RiSparklingLine },
  { id: 'ai-tools', label: 'AI Tools', Icon: RiChatAiLine },
];

export function HelpButtonsRow() {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const setPreview = useSetAtom(dataPreviewAtom);

  return (
    <section id="help-quick-links" className="flex w-full flex-col">
      <div className="flex w-full gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                'group relative flex aspect-square w-20 shrink-0 cursor-pointer select-none flex-col items-center justify-center gap-1 overflow-hidden rounded-lg bg-white',
                'shadow-[12px_12px_20px_0px_rgba(0,0,0,0.058)] hover:shadow-bnb',
                'border-2 transition-colors',
                isSelected ? 'border-primary-7' : 'border-transparent'
              )}
            >
              <Icon className="text-primary-9 size-5" />
              <span className="text-primary-9 text-xs font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default HelpButtonsRow;
