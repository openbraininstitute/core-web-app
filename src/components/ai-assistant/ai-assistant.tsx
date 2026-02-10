'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import React, { type CSSProperties } from 'react';
import { useServiceAiAgentChat } from '@/services/ai-agent';
import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';
import type { TAppUInterfaceSection } from '@/utils/key-builder';
import styles from './ai-assistant.module.css';
import { AiContextProvider, MINIMAL_PANEL_SIZE, usePanelWidth } from './hooks';
import { IconChat } from './icons/chat';
import { IconHistory } from './icons/history';
import { IconNewChat } from './icons/new-chat';
import PanelContent from './panel-content';
import PanelSplitter from './panel-splitter';

import type { TAppUInterfaceSection } from '@/utils/key-builder';

import styles from './ai-assistant.module.css';

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
  const { messages, status } = useServiceAiAgentChat(threadId ?? '');

  const style: CSSProperties = {
    //@ts-expect-error
    '--custom-panel-width': fullscreen ? '100%' : `${panelWidth.toFixed(0)}px`,
  };

  const canCreateNewChat = messages.length > 0 && status === 'ready';

  const handleNewChat = async () => {
    if (!canCreateNewChat) return;
    await assistant.createThread();
    setTab('chat');
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
                panelWidth > MINIMAL_PANEL_SIZE && styles.shadow
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
                <button
                  type="button"
                  className={styles.newChatBtn}
                  disabled={!canCreateNewChat}
                  onClick={handleNewChat}
                >
                  <IconNewChat />
                  <div>New Chat</div>
                </button>
              </nav>
              <PanelContent
                className={styles.content}
                threadId={threadId}
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
