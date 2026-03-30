'use client';
import { PlusOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';

import AiAssistant from '@/components/ai-assistant';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';
export function Container() {
  const { state, setState } = usePanelState();

  useAgentState('smc_simulation_config');

  const isChatCollapsed = state === PanelState.Collapsed;
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
        isChatCollapsed
          ? 'bg-primary-9 border-primary-9 mr-3 shadow-md rounded-full! [transition:background-color_150ms_ease_200ms,border-color_150ms_ease_200ms]'
          : cn(
              'text-primary-9 mr-3 outline outline-1 outline-[#ddd] [outline-offset:-1px] bg-white [transition:none]',
              isFullscreen ? 'rounded-lg!' : 'rounded-2xl!'
            )
      )}
      animate={{ width: targetWidth, height: 'calc(100vh - 6rem)' }}
      initial={{ width: targetWidth, height: 'calc(100vh - 6rem)' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      <AnimatePresence>
        {isChatCollapsed ? (
          <button
            key="collapsed"
            type="button"
            onClick={() => updateState(PanelState.Expanded)}
            className="flex h-full w-full cursor-pointer flex-col items-center px-2 select-none"
            aria-label="expand AI assistant"
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
            {!isChatCollapsed && (
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
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
export default Container;
