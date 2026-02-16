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
import { useAgentState } from '@/services/ai-agent';
import { usePanelState } from '@/ui/segments/ai/hooks';
import { PanelState } from '@/ui/segments/ai/types';
import { cn } from '@/utils/css-class';
import { HydrateWrapper } from '@/wrappers/hydrate-wrapper';

import styles from '@/ui/segments/ai/container.module.css';

export function Container(): JSX.Element {
  const { state, setState, isCollapsed, isExpanded, isFullscreen } = usePanelState();
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

  const targetWidth = useMemo<string>(() => {
    if (isCollapsed) return '3rem';
    if (isFullscreen) return 'calc(100vw - 20px)';
    return '24rem';
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
      className={cn(
        styles.aiPanel,
        'text-white [grid-area:ai] border-none!',
        { 'text-primary-9 mr-3 rounded-lg! bg-white': isExpanded },
        { 'text-primary-9 my-2 bg-white shadow-lg': isFullscreen },
        {
          'bg-primary-9 border-primary-9 mr-3 text-white shadow-md': isCollapsed,
        },
        { 'rounded-full!': isCollapsed && animationComplete }
      )}
      animate={{
        width: targetWidth,
        height: targetHeight,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 10 : undefined,
        left: isFullscreen ? 10 : undefined,
        zIndex: isFullscreen ? 500 : 10,
      }}
      initial={false}
      transition={{ ease: ['easeIn', 'easeOut'], stiffness: 260, damping: 30 }}
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
        <div className="flex h-full w-full flex-col rounded-lg">
          <div className="flex items-center justify-between px-3 py-3">
            <div className="truncate text-lg font-bold">AI assistant</div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  beginTransition(
                    state === PanelState.Fullscreen ? PanelState.Expanded : PanelState.Fullscreen
                  )
                }
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white/10"
                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
              </button>
              <button
                type="button"
                onClick={() => beginTransition(PanelState.Collapsed)}
                className="inline-flex h-7 w-7 items-center justify-center rounded hover:bg-white/10"
                aria-label="Collapse"
              >
                <MinusOutlined />
              </button>
            </div>
          </div>
          <div className="relative flex-1 border-none">
            <HydrateWrapper>
              <AiAssistant section="explore" fullscreen={isFullscreen} />
            </HydrateWrapper>
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default Container;
