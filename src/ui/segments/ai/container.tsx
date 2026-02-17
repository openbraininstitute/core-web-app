'use client';

import { PlusOutlined } from '@ant-design/icons';
import { motion } from 'motion/react';
import { type JSX, useEffect, useState } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { usePanelWidth } from '@/components/ai-assistant/hooks';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

const EXPANDED_WIDTH = 400;

export function Container(): JSX.Element {
  const { state, setState, isCollapsed, isExpanded, isFullscreen } = usePanelState();
  const { panelWidth } = usePanelWidth();
  const [animationComplete, setAnimationComplete] = useState(false);

  useAgentState('smc_simulation_config');

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  const containerWidth = isCollapsed
    ? '3rem'
    : isFullscreen
      ? 'calc(100vw - 20px)'
      : `${EXPANDED_WIDTH}px`;
  const containerHeight = isFullscreen ? 'calc(100vh - 1rem)' : 'calc(100vh - 6rem)';
  const contentWidth = isFullscreen ? '100%' : `${panelWidth}px`;

  function beginTransition(next: PanelState) {
    setAnimationComplete(false);
    setState(next);
  }

  return (
    <motion.div
      id="workspace-ai"
      className={cn(
        styles.aiPanel,
        '[grid-area:ai]',
        { 'bg-primary-9 border-primary-9 mr-3 text-white shadow-md': isCollapsed },
        { 'rounded-full!': isCollapsed && animationComplete },
        { 'text-primary-9 my-2 bg-white shadow-lg': isFullscreen },
        { 'mr-3': isExpanded }
      )}
      animate={{
        width: containerWidth,
        height: containerHeight,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 10 : undefined,
        left: isFullscreen ? undefined : undefined,
        zIndex: isFullscreen ? 500 : 100,
      }}
      initial={false}
      transition={{ ease: ['easeIn', 'easeOut'], stiffness: 150, damping: 25 }}
      onAnimationComplete={() => setAnimationComplete(true)}
    >
      {isCollapsed ? (
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
        <div
          className="absolute top-0 right-0 h-full rounded-lg overflow-visible"
          style={{ width: contentWidth, '--custom-panel-width': contentWidth }}
        >
          <HydrateWrapper>
            <AiAssistant
              section="explore"
              fullscreen={isFullscreen}
              onFullscreenToggle={() =>
                beginTransition(
                  state === PanelState.Fullscreen ? PanelState.Expanded : PanelState.Fullscreen
                )
              }
              onCollapse={() => beginTransition(PanelState.Collapsed)}
            />
          </HydrateWrapper>
        </div>
      )}
    </motion.div>
  );
}

export default Container;
