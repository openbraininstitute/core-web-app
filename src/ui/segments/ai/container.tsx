'use client';

import { useMemo, useState, useEffect, type JSX } from 'react';
import { motion } from 'motion/react';
import {
  MinusOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import { cn } from '@/utils/css-class';

const PanelState = {
  Collapsed: 'collapsed',
  Expanded: 'expanded',
  Fullscreen: 'fullscreen',
} as const;

type TPanelState = (typeof PanelState)[keyof typeof PanelState];

export function Container(): JSX.Element {
  const [state, setState] = useState<TPanelState>(PanelState.Collapsed);

  const isCollapsed = state === PanelState.Collapsed;
  const isExpanded = state === PanelState.Expanded;
  const isFullscreen = state === PanelState.Fullscreen;

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

  const targetHeight = useMemo<string>(
    () => (isFullscreen ? 'calc(100vh - 1rem)' : 'calc(100vh - 6rem)'),
    [isFullscreen]
  );

  // avoid noticeable morphing of border radius by locking it during animation
  const getRadius = (s: TPanelState): number => (s === PanelState.Collapsed ? 9999 : 16);
  const [visualRadius, setVisualRadius] = useState<number>(getRadius(PanelState.Collapsed));

  function beginTransition(next: TPanelState) {
    // when expanding/fullscreen, start with 8px immediately.
    // when collapsing, keep 8px during the shrink and snap to 9999 at the end.
    if (next === PanelState.Collapsed) {
      setVisualRadius(getRadius(state));
    } else {
      setVisualRadius(getRadius(next));
    }
    setState(next);
  }

  return (
    <motion.div
      id="workspace-ai"
      className={cn(
        'text-white [grid-area:ai]',
        { 'text-primary-9 mx-3 bg-white shadow-lg': isExpanded },
        { 'text-primary-9 my-2 bg-white px-4 shadow-lg': isFullscreen },
        { 'bg-primary-9 border-primary-9 m-2 text-white shadow-md': isCollapsed }
      )}
      animate={{
        width: targetWidth,
        height: targetHeight,
        position: isFullscreen ? 'fixed' : 'relative',
        top: isFullscreen ? 0 : undefined,
        right: isFullscreen ? 10 : undefined,
        left: isFullscreen ? 10 : undefined,
        zIndex: isFullscreen ? 50 : 1,
      }}
      initial={false}
      transition={{ type: 'spring', stiffness: 260, damping: 30 }}
      style={{ borderRadius: visualRadius }}
      onAnimationComplete={() => {
        // if we're collapsing, snap to full (9999) radius at the end.
        if (state === PanelState.Collapsed) setVisualRadius(getRadius(PanelState.Collapsed));
      }}
    >
      {isCollapsed ? (
        <button
          type="button"
          onClick={() => beginTransition(PanelState.Expanded)}
          className="relative flex h-full w-full cursor-pointer items-start justify-center select-none"
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
        <div className="flex h-full w-full flex-col overflow-hidden rounded-lg">
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
          <div className="flex-1 overflow-auto px-2 pb-2">{/* @fabien: content goes here */}</div>
        </div>
      )}
    </motion.div>
  );
}

export default Container;
