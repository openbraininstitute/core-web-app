'use client';

import { FullscreenExitOutlined, FullscreenOutlined, MinusOutlined } from '@ant-design/icons';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type CSSProperties } from 'react';

import { useServiceAiAgentChat } from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';

import { AiContextProvider, MINIMAL_PANEL_SIZE, usePanelWidth } from './hooks';
import { IconChat } from './icons/chat';
import { IconHistory } from './icons/history';
import { IconNewChat } from './icons/new-chat';
import PanelContent from './panel-content';
import TabTransitionLoader from './panel-content/tab-transition-loader/tab-transition-loader';
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
}

const queryClient = new QueryClient();

export default function AiAssistant({
  className,
  fullscreen,
  section,
  containerRef,
  onFullscreenToggle,
  onCollapse,
}: AiAssistantProps) {
  const { panelWidth, setPanelContainer } = usePanelWidth();
  const [tab, setTab] = React.useState<'chat' | 'history'>('chat');
  const assistant = useAiAssistant();
  const threadId = assistant.threadId.useValue();
  const isEmptyThread = assistant.isEmptyThread.useValue();
  const { status } = useServiceAiAgentChat(threadId ?? '');

  const canCreateNewChat = status === 'ready';

  const style: CSSProperties = {
    '--custom-panel-width': fullscreen ? '100%' : `${panelWidth.toFixed(0)}px`,
  };

  const handleNewChat = async () => {
    setTab('chat');
    if (!isEmptyThread) {
      assistant.threadId.set(undefined);
      await assistant.createThread();
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AiContextProvider section={section}>
        <div
          ref={(el) => {
            setPanelContainer(el);
            containerRef?.(el);
          }}
          style={style}
          className={classNames(className, styles.aiAssistant, 'rounded-xl! border-0!')}
        >
          <div
            className={classNames(styles.overlay, panelWidth > MINIMAL_PANEL_SIZE && styles.shadow)}
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
                  className={classNames(styles.navBtn, tab === 'chat' && styles.navBtnActive)}
                  onClick={() => setTab('chat')}
                  aria-label="Chat"
                  title="Chat"
                >
                  <IconChat />
                </button>

                <button
                  type="button"
                  className={classNames(styles.navBtn, tab === 'history' && styles.navBtnActive)}
                  onClick={() => setTab('history')}
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

            <PanelContent
              className={styles.content}
              threadId={threadId}
              tab={tab}
              onTabChange={setTab}
            />
            {!fullscreen && <PanelSplitter />}
          </div>
        </div>
      </AiContextProvider>
    </QueryClientProvider>
  );
}
