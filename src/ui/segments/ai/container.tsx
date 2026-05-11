'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useState, useTransition } from 'react';

import AiAssistant from '@/components/ai-assistant';
import IconPlus from '@/components/icons/Plus';
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

  const isCollapsed = contentState === PanelState.Collapsed;
  const isFullscreen = contentState === PanelState.Fullscreen;
  const targetWidth = sizeState === PanelState.Collapsed ? '3rem' : '400px';

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
        'text-white [grid-area:ai] z-[30] overflow-hidden',
        isCollapsed
          ? 'bg-primary-9 border-primary-9 mr-3 shadow-md rounded-full!'
          : cn(
              'text-primary-9 mr-3 outline outline-1 outline-[#ddd] [outline-offset:-1px] bg-white',
              isFullscreen ? 'rounded-lg!' : 'rounded-2xl!'
            )
      )}
      animate={{ width: targetWidth, height: 'calc(100vh - 6rem)' }}
      initial={false}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      onAnimationComplete={handleAnimationComplete}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => updateState(PanelState.Expanded)}
          className={styles.collapsed}
          // "relative flex h-full w-full cursor-pointer items-start justify-center px-2 select-none"
          aria-label="expand AI assistant"
          disabled={isPending}
        >
          <IconPlus />
          {/* <div className ="absolute top-3 flex items-center justify-center text-white">
            <PlusOutlined className="h-5 w-5" />
          </div> */}
          <div
            className="text-xl font-bold"
            // style={{
            //   transform: 'rotate(-90deg)',
            //   transformOrigin: 'center',
            //   whiteSpace: 'nowrap',
            //   position: 'relative',
            //   top: '80px',
            //   margin: 0,
            // }}
          >
            AI Assistant
          </div>
        </button>
      ) : (
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
