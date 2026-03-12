'use client';
import { PlusOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState, useTransition } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';
export function Container() {
  const { state, setState } = usePanelState();
  console.log('state:', state);
  const [isPending, startTransition] = useTransition();
  console.log('isPending:', isPending);
  const [contentState, setContentState] = useState(state);
  console.log('contentState:', contentState);
  const isUpdating = useRef(false);
  console.log('isUpdating.current:', isUpdating.current);

  useEffect(() => {
    console.log('useEffect - state changed:', state);
    setContentState(state);
  }, [state]);

  useAgentState('smc_simulation_config');

  const isCollapsed = contentState === PanelState.Collapsed;
  console.log('isCollapsed:', isCollapsed);
  const isFullscreen = contentState === PanelState.Fullscreen;
  console.log('isFullscreen:', isFullscreen);
  const targetWidth = contentState === PanelState.Collapsed ? '3rem' : '400px';
  console.log('targetWidth:', targetWidth);

  function updateState(next: PanelState) {
    console.log('updateState called with next:', next);
    if (next === contentState || isUpdating.current) return;
    isUpdating.current = true;
    console.log('isUpdating.current set to:', isUpdating.current);
    setContentState(next);
    console.log('setContentState called with:', next);
    startTransition(() => {
      setState(next);
      console.log('setState called with:', next);
      isUpdating.current = false;
      console.log('isUpdating.current set to:', isUpdating.current);
    });
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
            className="flex h-full w-full cursor-pointer flex-col items-center px-2 select-none"
            aria-label="expand AI assistant"
            disabled={isPending}
          >
            <div className="mt-3 flex h-8 w-8 items-center justify-center text-white">
              <PlusOutlined className="h-4 w-4" />
            </div>
            <div
              className="text-xl font-bold"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                whiteSpace: 'nowrap',
                position: 'relative',
                top: '45px',
                margin: 0,
              }}
            >
              AI Assistant
            </div>
          </button>
        ) : (
          <div
            key="expanded"
            className="flex h-full w-full flex-col rounded-lg relative overflow-visible"
          >
            {!isCollapsed && (
              <HydrateWrapper key="ai-assistant">
                <AiAssistant
                  section="explore"
                  fullscreen={isFullscreen}
                  onFullscreenToggle={() =>
                    updateState(isFullscreen ? PanelState.Expanded : PanelState.Fullscreen)
                  }
                  aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  onCollapse={() => updateState(PanelState.Collapsed)}
                  disabled={isPending}
                />
              </HydrateWrapper>
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
export default Container;
