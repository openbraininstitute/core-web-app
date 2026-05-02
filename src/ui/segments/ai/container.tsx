'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState, useTransition } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

export function Container() {
  const { state, setState } = usePanelState();
  const [isPending, startTransition] = useTransition();

  const [sizeState, setSizeState] = useState(state);
  const [contentState, setContentState] = useState(state);

  useEffect(() => {
    setSizeState(state);
    if (state !== PanelState.Collapsed) setContentState(state);
  }, [state]);

  useAgentState('smc_simulation_config');

  const isCollapsed = contentState === PanelState.Collapsed;
  const isFullscreen = contentState === PanelState.Fullscreen;
  const targetWidth = sizeState === PanelState.Collapsed ? '0px' : '400px';

  function updateState(next: PanelState) {
    setSizeState(next);
    if (next !== PanelState.Collapsed) setContentState(next);
    startTransition(() => setState(next));
  }

  function handleAnimationComplete() {
    setContentState(sizeState);
  }

  return (
    <motion.div
      id="workspace-ai"
      className={cn(
        styles.aiPanel,
        '[grid-area:ai] z-[30] overflow-hidden',
        isCollapsed
          ? 'pointer-events-none'
          : cn(
              'text-primary-9 ml-3 outline outline-1 outline-[#ddd] [outline-offset:-1px] bg-white',
              isFullscreen ? 'rounded-lg!' : 'rounded-2xl!'
            )
      )}
      animate={{ width: targetWidth, height: 'calc(100vh - 6rem)' }}
      initial={false}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onAnimationComplete={handleAnimationComplete}
    >
      {isCollapsed ? null : (
        <div className="flex h-full w-full flex-col rounded-lg relative overflow-visible">
          <AnimatePresence mode="wait">
            {sizeState !== PanelState.Collapsed && (
              <HydrateWrapper key="ai-assistant">
                <AiAssistant
                  section="explore"
                  fullscreen={isFullscreen}
                  onFullscreenToggle={() =>
                    updateState(
                      sizeState === PanelState.Fullscreen
                        ? PanelState.Expanded
                        : PanelState.Fullscreen
                    )
                  }
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  onCollapse={() => updateState(PanelState.Collapsed)}
                  disabled={isPending}
                />
              </HydrateWrapper>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

export default Container;
