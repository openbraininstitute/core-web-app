'use client';

import {
  FullscreenExitOutlined,
  FullscreenOutlined,
  MinusOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { motion } from 'motion/react';
import { type JSX, useEffect, useMemo, useState } from 'react';

import AiAssistant from '@/components/ai-assistant';
import { usePanelWidth } from '@/components/ai-assistant/hooks';
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

export function Container(): JSX.Element {
  const { state, setState, isCollapsed, isExpanded, isFullscreen } = usePanelState();
  const { panelWidth } = usePanelWidth();
  const [animationComplete, setAnimationComplete] = useState(false);

  const style: React.CSSProperties = {
    '--custom-panel-width': isFullscreen ? '100%' : `${panelWidth}px`,
  };
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

  const targetWidth = useMemo<string>(() => {
    if (isCollapsed) return '3rem';
    if (isFullscreen) return 'calc(100vw - 20px)';
    return '24rem'; // Fixed width for grid cell
  }, [isCollapsed, isFullscreen]);

  const targetHeight = useMemo<string>(() => {
    if (isFullscreen) return 'calc(100vh - 1rem)';
    if (isExpanded) return 'calc(100vh - 6rem)';
    if (isCollapsed) return 'calc(100vh - 6rem)';
    return 'calc(100vh - 5.2rem)';
  }, [isFullscreen, isExpanded, isCollapsed]);

  function beginTransition(next: PanelState) {
    setAnimationComplete(false);
    setState(next);
  }

  return (
    <motion.div
      id="workspace-ai"
      style={style}
      className={cn(
        styles.aiPanel,
        'text-white [grid-area:ai]',
        { 'text-primary-9 mr-3 rounded-lg! bg-white': isExpanded },
        { 'text-primary-9 my-2 bg-white shadow-lg': isFullscreen },
        { 'bg-primary-9 border-primary-9 mr-3 text-white shadow-md': isCollapsed },
        { 'rounded-full!': isCollapsed && animationComplete }
      )}
      animate={{
        width: targetWidth,
        height: targetHeight,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 10 : undefined,
        left: isFullscreen ? 10 : undefined,
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
          className="relative flex h-full w-full cursor-pointer items-start justify-center px-2 select-none"
          aria-label="expand AI assistant"
        >
          <div className="absolute top-3 flex items-center justify-center text-white">
            <PlusOutlined className="h-5 w-5" />
          </div>
          <div
            className="text-xl font-bold"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: 'center',
              whiteSpace: 'nowrap',
              position: 'relative',
              top: '80px',
              margin: 0,
            }}
          >
            AI Assistant
          </div>
        </button>
      ) : (
        <div className="flex h-full w-full flex-col rounded-lg overflow-visible">
          <div className="relative flex-1 border-none overflow-visible">
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
        </div>
      )}
    </motion.div>
  );
}

export default Container;
