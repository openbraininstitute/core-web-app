'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React, { CSSProperties } from 'react';
import dynamic from 'next/dynamic';

import { AiContextProvider, useCollapsedPanel } from './hooks';
import PanelSplitter from './panel-splitter';
import PanelContent from './panel-content';
import { classNames } from '@/util/utils';
import { useServiceAiAgentThread } from '@/services/ai-agent';
import { useLocalStorage } from '@/util/storage';
import { isNumber } from '@/util/type-guards';

import styles from './ai-assistant.module.css';

const Spinner = dynamic(() => import('./spinner/spinner'), {
  ssr: false,
});

interface AiAssistantProps {
  className?: string;
  section: 'explore' | 'build' | 'simulate' | 'bookmark' | 'activity';
}

export default function AiAssistant({ className, section }: AiAssistantProps) {
  const [panelWidth, setPanelWidth] = useLocalStorage('ai-assistant/panel-width', 25, isNumber);
  const [collapsedPanel, setCollapsedPanel] = useCollapsedPanel();
  const [threadId, recreateThreadId] = useServiceAiAgentThread();

  const style: CSSProperties = {
    '--custom-panel-width': `${panelWidth.toFixed(2)}vw`,
  };
  const handleToggleCollapse = () => {
    setCollapsedPanel(!collapsedPanel);
  };

  return (
    <AiContextProvider value={{ section }}>
      <div
        style={style}
        className={classNames(className, styles.aiAssistant, panelWidth > 99 && styles.fullscreen)}
        data-collapsed={collapsedPanel}
      >
        <Header collapsedPanel={collapsedPanel} onToggleCollapse={handleToggleCollapse} />
        {!collapsedPanel && threadId && (
          <div className={classNames(styles.overlay, panelWidth > 25 && styles.shadow)}>
            <Header collapsedPanel={collapsedPanel} onToggleCollapse={handleToggleCollapse} />
            <PanelContent threadId={threadId} onClearChat={recreateThreadId} />
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
