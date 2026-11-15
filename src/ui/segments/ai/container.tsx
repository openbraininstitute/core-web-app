'use client';

import { RiArrowDownSLine, RiArrowUpSLine } from '@remixicon/react';
import { AnimatePresence, motion } from 'motion/react';
import dynamic from 'next/dynamic';

import IconPlus from '@/components/icons/Plus';
import { IconSpinner } from '@/components/icons/spinner';
import { aiButtonFlag, useFlag } from '@/features/feature-flags';
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
  const aiButton = useFlag(aiButtonFlag.key);

  const isCollapsed = state === PanelState.Collapsed;
  const isFullscreen = state === PanelState.Fullscreen;
  const targetWidth = state === PanelState.Collapsed ? '3rem' : '400px';
  const phone = useMediaQuery('(max-width: 767px)', false);

  function updateState(next: PanelState) {
    if (next === state) return;
    setState(next);
  }

  // with the AI button in the top menu, there is no rail while it is closed: the button opens it
  if ((aiButton || phone) && isCollapsed) return null;

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
      className={cn(
        styles.aiPanel,
        'text-white [grid-area:ai] z-[30]',
        isCollapsed
          ? 'bg-primary-9 border-primary-9 mr-3 shadow-md rounded-full! [transition:background-color_150ms_ease_200ms,border-color_150ms_ease_200ms]'
          : cn(
              // as the home's cards are (the user asked): white, a hairline round it, flat, its top 12px under the
              // toolbar and its foot 15px over the window's edge, as the pages' own boxes sit
              'text-primary-9 mt-[12px] mr-3 outline outline-1 outline-[rgb(19_48_111/0.12)] [outline-offset:-1px] bg-white [transition:none]',
              isFullscreen ? 'rounded-lg!' : 'rounded-[20px]!'
            )
      )}
      animate={{ width: targetWidth, height: isCollapsed ? 'calc(100vh - 6rem)' : 'calc(100vh - 4rem - 27px)' }}
      initial={false}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <AnimatePresence>
        {isCollapsed ? (
          <button
            key="collapsed"
            type="button"
            onClick={() => updateState(PanelState.Expanded)}
            className={styles.collapsed}
            aria-label="expand AI assistant"
            data-testid="ai-assistant-open-button"
          >
            <IconPlus />
            <div>OBI Assistant</div>
          </button>
        ) : (
          <div
            key="expanded"
            className="flex h-full w-full flex-col rounded-lg relative overflow-visible"
          >
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Container;
