'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React, { type CSSProperties } from 'react';

import { Spinner } from './spinner';
import { AiContextProvider, useCollapsedPanel } from './hooks';
import PanelSplitter from './panel-splitter';
import { IconChat } from './icons/chat';
import { IconHistory } from './icons/history';
import PanelContent from './panel-content';
import { classNames } from '@/util/utils';
import { useServiceAiAgentThread } from '@/services/ai-agent';
import { useLocalStorage } from '@/util/storage';
import { isNumber } from '@/util/type-guards';

import styles from './ai-assistant.module.css';

interface AiAssistantProps {
  className?: string;
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity';
}

export default function AiAssistant({ className, section }: AiAssistantProps) {
  const [tab, setTab] = React.useState<'chat' | 'history'>('chat');
  const [panelWidth, setPanelWidth] = useLocalStorage('ai-assistant/panel-width', 25, isNumber);
  const [collapsedPanel, setCollapsedPanel] = useCollapsedPanel();
  const [threadId, recreateThreadId] = useServiceAiAgentThread();

  const style: CSSProperties = {
    '--custom-panel-width': `${panelWidth.toFixed(2)}vw`,
  };
  const handleToggleCollapse = () => {
    setCollapsedPanel(!collapsedPanel);
  };
  const isFullWidth = panelWidth > 95;

  return (
    <AiContextProvider value={{ section }}>
      <div
        style={style}
        className={classNames(className, styles.aiAssistant, isFullWidth && styles.fullscreen)}
        data-collapsed={collapsedPanel}
      >
        <Header collapsedPanel={collapsedPanel} onToggleCollapse={handleToggleCollapse} />
        {!collapsedPanel && threadId && (
          <div className={classNames(styles.overlay, panelWidth > 25 && styles.shadow)}>
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
            <Header collapsedPanel={collapsedPanel} onToggleCollapse={handleToggleCollapse} />
            <PanelContent
              className={styles.content}
              threadId={threadId}
              onClearChat={recreateThreadId}
              tab={tab}
            />
            <PanelSplitter panelWidth={panelWidth} setPanelWidth={setPanelWidth} />
          </div>
        )}
        {!collapsedPanel && !threadId && <Spinner />}
      </div>
    </AiContextProvider>
  );
}

function Header({
  collapsedPanel,
  onToggleCollapse,
}: {
  collapsedPanel: boolean;
  onToggleCollapse: () => void;
}) {
  return (
    <button className={styles.header} type="button" onClick={onToggleCollapse}>
      <h1>AI Assistant</h1>
      <div className={styles.icons}>
        {collapsedPanel ? (
          <PlusOutlined className="h-[1em] w-[1em]" />
        ) : (
          <MinusOutlined className="h-[1em] w-[1em]" />
        )}
      </div>
    </button>
  );
}
