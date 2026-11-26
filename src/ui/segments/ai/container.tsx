'use client';

import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import { motion } from 'motion/react';
import dynamic from 'next/dynamic';

import { IconSpinner } from '@/components/icons/spinner';
import { DISMISSABLE_ATTRIBUTE } from '@/hooks/use-dismiss-on-outside-interaction';
import { useMediaQuery } from '@/hooks/use-media-query';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

// loaded when the panel opens: the chat stack (KaTeX, markdown, AI SDK) is ~245 KiB gz and the panel starts collapsed
const AiAssistant = dynamic(() => import('@/features/ai-assistant'), {
  ssr: false,
  loading: () => (
    <div className="grid h-full place-items-center" data-testid="ai-assistant-loading">
      <IconSpinner size="2em" />
    </div>
  ),
});

export function Container() {
  const { state, setState } = usePanelState();

  const isCollapsed = state === PanelState.Collapsed;
  const isFullscreen = state === PanelState.Fullscreen;
  const phone = useMediaQuery('(max-width: 767px)', false);

  function updateState(next: PanelState) {
    if (next === state) return;
    setState(next);
  }

  // no rail while it is closed: the top menu's AI button opens it
  if (isCollapsed) return null;

  // On a phone (the user asked): a frosted window floating along the foot, over the page and above the tabs, which
  // its button (or the assistant's own fullscreen one) grows upwards, still floating, and shrinks back.
  if (phone)
    return (
      <motion.div
        id="workspace-ai"
        className="text-primary-9 fixed inset-x-2 bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-[55] flex flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/75 shadow-[0_18px_50px_rgb(20_40_90/0.28)] backdrop-blur-xl"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0, height: isFullscreen ? 'calc(100dvh - 9rem)' : '46dvh' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        <button
          type="button"
          onClick={() => updateState(isFullscreen ? PanelState.Expanded : PanelState.Fullscreen)}
          aria-label={isFullscreen ? 'Shrink the assistant' : 'Grow the assistant upwards'}
          className="text-primary-9 mx-auto mt-1.5 flex h-6 w-14 shrink-0 items-center justify-center rounded-full bg-white/70 shadow-sm"
        >
          {isFullscreen ? <RiArrowDownSLine className="size-5" /> : <RiArrowUpSLine className="size-5" />}
        </button>
        <div className="relative min-h-0 flex-1">
          <HydrateWrapper key="ai-assistant">
            <AiAssistant
              section="explore"
              fill
              // see-through, as the window it floats in: the page shows under its panes
              className="[--color-background:rgb(250_250_250/0.45)]! [--color-neutral-9:rgb(255_255_255/0.55)]!"
              fullscreen={isFullscreen}
              onFullscreenToggle={() =>
                updateState(isFullscreen ? PanelState.Expanded : PanelState.Fullscreen)
              }
              aria-label={isFullscreen ? 'Shrink the assistant' : 'Grow the assistant upwards'}
              onClose={() => updateState(PanelState.Collapsed)}
            />
          </HydrateWrapper>
        </div>
      </motion.div>
    );

  return (
    <motion.div
      id="workspace-ai"
      {...{ [DISMISSABLE_ATTRIBUTE]: '' }}
      className={cn(
        styles.aiPanel,
        '[grid-area:ai] z-[30]',
        // as the home's cards are (the user asked): white, a hairline round it, flat, its top 12px under the
        // toolbar and its foot 15px over the window's edge, as the pages' own boxes sit
        'text-primary-9 mt-[12px] mr-3 outline outline-1 outline-[rgb(19_48_111/0.12)] [outline-offset:-1px] bg-white [transition:none]',
        isFullscreen ? 'rounded-lg!' : 'rounded-[20px]!'
      )}
      animate={{ width: '400px', height: 'calc(100vh - 4rem - 27px)' }}
      initial={false}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <div className="relative flex h-full w-full flex-col overflow-visible rounded-lg">
        <HydrateWrapper key="ai-assistant">
          <AiAssistant
            section="explore"
            // white, as the home is, not the old grey
            className="[--color-background:#ffffff]!"
            fullscreen={isFullscreen}
            onFullscreenToggle={() =>
              updateState(isFullscreen ? PanelState.Expanded : PanelState.Fullscreen)
            }
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClose={() => updateState(PanelState.Collapsed)}
          />
        </HydrateWrapper>
      </div>
    </motion.div>
  );
}

export default Container;
