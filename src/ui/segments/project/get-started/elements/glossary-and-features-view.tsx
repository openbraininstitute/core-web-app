'use client';

import { useAtom } from 'jotai';

import AiChatToolsSection from '@/ui/segments/help/ai-chat-tools';
import FeaturesSection from '@/ui/segments/help/features';
import GlossarySection from '@/ui/segments/help/glossary';
import { GuidesView } from '@/ui/segments/project/get-started/elements/guides-view';
import {
  type LeftPaneView,
  leftPaneViewAtom,
} from '@/ui/segments/project/get-started/elements/left-pane-view-atom';
import { cn } from '@/utils/css-class';

import type { GuidesContentsProps } from '@/services/sanity/api/get-guides-content';

const TABS: ReadonlyArray<{ id: Exclude<LeftPaneView, null>; label: string }> = [
  { id: 'glossary', label: 'Glossary' },
  { id: 'guides', label: 'Guides' },
  { id: 'features', label: 'Features' },
  { id: 'ai-tools', label: 'AI Tools' },
];

const TAB_IDS = TABS.map((t) => t.id);

export function GlossaryAndFeaturesView({ guidesContent }: { guidesContent: GuidesContentsProps }) {
  const [view, setView] = useAtom(leftPaneViewAtom);
  const active = view && TAB_IDS.includes(view) ? view : 'glossary';

  return (
    <div className="flex h-full w-full flex-col gap-3">
      <div className="flex w-full flex-wrap gap-2">
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              className={cn(
                'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
                isActive
                  ? 'bg-primary-9 text-white'
                  : 'border-neutral-2 text-primary-9 hover:bg-neutral-1 border bg-white'
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-0 flex-1">
        {active === 'glossary' && <GlossarySection />}
        {active === 'guides' && <GuidesView guides={guidesContent} />}
        {active === 'features' && <FeaturesSection />}
        {active === 'ai-tools' && <AiChatToolsSection />}
      </div>
    </div>
  );
}

export default GlossaryAndFeaturesView;
