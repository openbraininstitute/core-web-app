'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import React, { type CSSProperties } from 'react';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';
import type { TAppUInterfaceSection } from '@/utils/key-builder';
import styles from './ai-assistant.module.css';
import { AiContextProvider, MINIMAL_PANEL_SIZE, usePanelWidth } from './hooks';
import { IconChat } from './icons/chat';
import { IconHistory } from './icons/history';
import PanelContent from './panel-content';
import PanelSplitter from './panel-splitter';

interface AiAssistantProps {
  className?: string;
  fullscreen: boolean;
  section: TAppUInterfaceSection;
}

const Spinner = dynamic(() => import('./spinner/spinner'), { ssr: false });

const queryClient = new QueryClient();

export default function AiAssistant({ className, fullscreen, section }: AiAssistantProps) {
  const { panelWidth, setPanelContainer } = usePanelWidth();
  const [tab, setTab] = React.useState<'chat' | 'history'>('chat');
  const assistant = useAiAssistant();
  const threadId = assistant.threadId.useValue();
  const style: CSSProperties = {
    '--custom-panel-width': fullscreen ? '100%' : `${panelWidth.toFixed(0)}px`,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AiContextProvider section={section}>
        <div
          ref={setPanelContainer}
          style={style}
          className={classNames(className, styles.aiAssistant, 'rounded-xl! border-0!')}
        >
          <div className={styles.mask} />
          {threadId && (
            <div
              className={classNames(
                styles.overlay,
                panelWidth > MINIMAL_PANEL_SIZE && styles.shadow,
              )}
            >
              <nav>
                <button
                  type="button"
                  className={classNames(tab === 'chat' && styles.selected)}
                  onClick={() => setTab('chat')}
                >
                  <IconChat />
                  <div>Chat</div>
                </button>
                <button
                  type="button"
                  className={classNames(tab === 'history' && styles.selected)}
                  onClick={() => setTab('history')}
                >
                  <IconHistory />
                  <div>History</div>
                </button>
              </nav>
              <PanelContent
                className={styles.content}
                threadId={threadId}
                onClearChat={assistant.createThread}
                tab={tab}
                onTabChange={setTab}
              />
              {!fullscreen && <PanelSplitter />}
            </div>
          )}
          {!threadId && <Spinner />}
        </div>
      </AiContextProvider>
    </QueryClientProvider>
  );
}
