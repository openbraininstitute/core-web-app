'use client';

import { PlusOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import { type JSX, useMemo, useState } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

export function Container(): JSX.Element {
  const { state, setState, isCollapsed, isFullscreen } = usePanelState();
  const [visualState, setVisualState] = useState(state);

  useAgentState('smc_simulation_config');

  const isReallyCollapsed = visualState === PanelState.Collapsed;
  const isReallyExpanded = visualState === PanelState.Expanded;
  const isReallyFullscreen = visualState === PanelState.Fullscreen;

  const targetWidth = useMemo<string>(() => {
    if (isCollapsed) return '3rem';
    if (isFullscreen) return '400px';
    return '400px';
  }, [isCollapsed, isFullscreen]);

  function beginTransition(next: PanelState) {
    // on collapse, keep the expanded look until animation is over
    if (next !== PanelState.Collapsed) {
      setVisualState(next);
    }
    // on expand/fullscreen, change the view right away so content shows quickly
    setState(next);
  }

  // sync visual state to the actual state
  function handleAnimationComplete() {
    setVisualState(state);
  }

  return (
    <motion.div
      id="workspace-ai"
      className={cn(
        styles.aiPanel,
        'text-white [grid-area:ai] z-[30]',
        {
          'text-primary-9 mr-3 border border-[#ddd] bg-white':
            isReallyExpanded || isReallyFullscreen,
          'rounded-2xl!': isReallyExpanded,
          'rounded-lg!': isReallyFullscreen,
        },
        { 'bg-primary-9 border-primary-9 mr-3 text-white shadow-md': isReallyCollapsed },
        { 'rounded-full!': isReallyCollapsed }
      )}
      animate={{
        width: targetWidth,
        height: 'calc(100vh - 6rem)',
      }}
      initial={false}
      transition={{ ease: ['easeIn', 'easeOut'], stiffness: 150, damping: 25 }}
      onAnimationComplete={handleAnimationComplete}
    >
      {isReallyCollapsed ? (
        <button
          type="button"
          onClick={() => beginTransition(PanelState.Expanded)}
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
        <div className="flex h-full w-full flex-col rounded-lg overflow-visible">
          <div className="relative flex-1 border-none overflow-visible">
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <HydrateWrapper key="ai-assistant">
                  <AiAssistant
                    section="explore"
                    fullscreen={isReallyFullscreen}
                    onFullscreenToggle={() =>
                      beginTransition(
                        state === PanelState.Fullscreen
                          ? PanelState.Expanded
                          : PanelState.Fullscreen
                      )
                    }
                    aria-label={isReallyFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                    onCollapse={() => beginTransition(PanelState.Collapsed)}
                  />
                </HydrateWrapper>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default Container;
