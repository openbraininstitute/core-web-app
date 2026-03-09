'use client';

import { FullscreenExitOutlined, FullscreenOutlined, MinusOutlined } from '@ant-design/icons';
import { AnimatePresence, motion } from 'motion/react';
import React from 'react';

import { useServiceAiAgentChat } from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';

import { AiContextProvider, MINIMAL_PANEL_SIZE, useIsDragging, usePanelWidth } from './hooks';
import { IconHistory } from './icons/history';
import { IconNewChat } from './icons/new-chat';
import PanelContent from './panel-content';
import History from './panel-content/history';
import PanelSplitter from './panel-splitter';

import type { TAppUInterfaceSection } from '@/utils/key-builder';

import styles from './ai-assistant.module.css';

interface AiAssistantProps {
  className?: string;
  fullscreen: boolean;
  section: TAppUInterfaceSection;
  containerRef?: (el: HTMLDivElement | null) => void;
  onFullscreenToggle?: () => void;
  onCollapse?: () => void;
  disabled?: boolean;
}

export default function AiAssistant({
  className,
  fullscreen,
  section,
  containerRef,
  onFullscreenToggle,
  onCollapse,
  disabled,
}: AiAssistantProps) {
  const { panelWidth } = usePanelWidth();
  const isDragging = useIsDragging();
  const [tab, setTab] = React.useState<'chat' | 'history'>('chat');
  const assistant = useAiAssistant();
  const threadId = assistant.threadId.useValue();
  const isEmptyThread = assistant.isEmptyThread.useValue();
  const { status } = useServiceAiAgentChat(threadId ?? '');

  const canCreateNewChat = status === 'ready';

  const handleNewChat = async () => {
    setTab('chat');
    if (!isEmptyThread) {
      assistant.threadId.set(undefined);
      await assistant.createThread();
    }
  };

  const animationProps = {
    position: fullscreen ? 'fixed' : 'absolute',
    height: fullscreen ? 'calc(100vh - 1rem)' : '100%',
    top: fullscreen ? '0.5rem' : 0,
    right: fullscreen ? '10px' : 0,
  } as const;

  return (
    <AiContextProvider section={section}>
      <div
        ref={containerRef}
        className={classNames(className, styles.aiAssistant, 'rounded-xl! border-0!')}
      >
        <motion.div
          className={classNames(styles.overlay, panelWidth > MINIMAL_PANEL_SIZE && styles.shadow)}
          initial={{ opacity: 0, width: 0, ...animationProps }}
          animate={{
            opacity: 1,
            width: fullscreen ? 'calc(100vw - 20px)' : `${panelWidth}px`,
            ...animationProps,
          }}
          exit={{ opacity: 0, width: 0 }}
          transition={isDragging ? { duration: 0 } : { duration: 0.25, ease: 'easeInOut' }}
        >
          <div className={styles.header}>
            <nav className={styles.headerNav}>
              <button
                type="button"
                className={classNames(styles.navBtn, styles.newChatBtn)}
                disabled={!canCreateNewChat}
                onClick={handleNewChat}
                aria-label="New Chat"
                title="New Chat"
              >
                <IconNewChat />
              </button>
              <button
                type="button"
                className={classNames(styles.navBtn, tab === 'history' && styles.navBtnActive)}
                onClick={() => setTab(tab === 'history' ? 'chat' : 'history')}
                aria-label="History"
                title="History"
              >
                <IconHistory />
              </button>
            </nav>

            <div className={styles.headerTitle}>AI assistant</div>

            <div className={styles.headerActions}>
              {onFullscreenToggle && (
                <button
                  type="button"
                  onClick={onFullscreenToggle}
                  className={styles.headerBtn}
                  aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  disabled={disabled}
                  title={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                >
                  {fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                </button>
              )}
              {onCollapse && (
                <button
                  type="button"
                  onClick={onCollapse}
                  className={classNames(styles.headerBtn, styles.collapseBtn)}
                  aria-label="Collapse"
                  title="Collapse"
                >
                  <MinusOutlined />
                </button>
              )}
            </div>
          </div>

          <div className={styles.contentWrapper}>
            <PanelContent
              className={styles.content}
              threadId={threadId}
              tab="chat"
              onTabChange={setTab}
            />

            <AnimatePresence>
              {tab === 'history' && (
                <motion.div
                  className={styles.historyOverlay}
                  initial={{ opacity: 0, scale: 0.985, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.985, y: 8 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  <History onBack={() => setTab('chat')} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!fullscreen && <PanelSplitter />}
        </motion.div>
      </div>
    </AiContextProvider>
  );
}
