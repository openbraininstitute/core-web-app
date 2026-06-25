'use client';

import { AnimatePresence, motion } from 'motion/react';

import IconPlus from '@/components/icons/Plus';
import AiAssistant from '@/features/ai-assistant';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

export function Container() {
  const { state, setState } = usePanelState();

  const isCollapsed = state === PanelState.Collapsed;
  const isFullscreen = state === PanelState.Fullscreen;
  const targetWidth = state === PanelState.Collapsed ? '3rem' : '400px';

  function updateState(next: PanelState) {
    if (next === state) return;
    setState(next);
  }

  return (
    <motion.div
      id="workspace-ai"
      className={cn(
        styles.aiPanel,
        'text-white [grid-area:ai] z-[30]',
        isCollapsed
          ? 'bg-primary-9 border-primary-9 mr-3 shadow-md rounded-full! [transition:background-color_150ms_ease_200ms,border-color_150ms_ease_200ms]'
          : cn(
              'text-primary-9 mr-3 outline outline-1 outline-[#ddd] [outline-offset:-1px] bg-white [transition:none]',
              isFullscreen ? 'rounded-lg!' : 'rounded-2xl!'
            )
      )}
      animate={{ width: targetWidth, height: 'calc(100vh - 6rem)' }}
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
                fullscreen={isFullscreen}
                onFullscreenToggle={() =>
                  updateState(isFullscreen ? PanelState.Expanded : PanelState.Fullscreen)
                }
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                onCollapse={() => updateState(PanelState.Collapsed)}
              />
            </HydrateWrapper>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default Container;
