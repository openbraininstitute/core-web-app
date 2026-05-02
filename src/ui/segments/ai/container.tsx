'use client';

import { AnimatePresence, motion, useDragControls } from 'motion/react';
import { useEffect, useState, useTransition } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

export function Container() {
  const { state, setState } = usePanelState();
  const [isPending, startTransition] = useTransition();
  const dragControls = useDragControls();

  const [sizeState, setSizeState] = useState(state);
  const [contentState, setContentState] = useState(state);

  // Sync local state when the flag changes externally (e.g. from the top-menu AI button).
  useEffect(() => {
    setSizeState(state);
    if (state !== PanelState.Collapsed) setContentState(state);
  }, [state]);

  useAgentState('smc_simulation_config');

  const isCollapsed = contentState === PanelState.Collapsed;
  const isFullscreen = contentState === PanelState.Fullscreen;
  const isHidden = sizeState === PanelState.Collapsed;

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
      drag={!isFullscreen && !isHidden}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      className={cn(
        'fixed top-24 right-4 z-50 flex w-[400px] flex-col overflow-hidden',
        'h-[calc((100vh-8rem)/3)]',
        'text-primary-9 outline outline-1 outline-[#ddd] [outline-offset:-1px] bg-white shadow-lg',
        isFullscreen ? 'rounded-lg!' : 'rounded-2xl!',
        isHidden && 'pointer-events-none'
      )}
      animate={{ opacity: isHidden ? 0 : 1 }}
      initial={false}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onAnimationComplete={handleAnimationComplete}
    >
      {isCollapsed ? null : (
        <>
          <button
            type="button"
            aria-label="Drag AI panel"
            onPointerDown={(e) => dragControls.start(e)}
            className="flex h-5 shrink-0 cursor-move items-center justify-center bg-neutral-100 hover:bg-neutral-200"
          >
            <div className="bg-neutral-3 h-1 w-10 rounded-full" />
          </button>
          <div className="relative flex-1 min-h-0 overflow-visible">
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
        </>
      )}
    </motion.div>
  );
}

export default Container;
