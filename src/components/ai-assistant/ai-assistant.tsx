'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React, { CSSProperties } from 'react';

import { useCollapsedPanel } from './hooks';
import PanelSplitter from './panel-splitter';
import PanelContent from './panel-content';
import { classNames } from '@/util/utils';
import { useServiceAiAgentThread } from '@/services/ai-agent';
import { useLocalStorage } from '@/util/storage';
import { isNumber } from '@/util/type-guards';

import styles from './ai-assistant.module.css';

export interface LiteratureSuggestionsProps {
  className?: string;
}

export default function ArtificialIntelligenceAssistant({ className }: LiteratureSuggestionsProps) {
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
    <div
      style={style}
      className={classNames(className, styles.aiAssistant)}
      data-collapsed={collapsedPanel}
    >
      <button className={styles.header} type="button" onClick={handleToggleCollapse}>
        <h1>AI Assistant</h1>
        <div className={styles.icons}>
          {collapsedPanel ? (
            <PlusOutlined className="h-[1em] w-[1em]" />
          ) : (
            <MinusOutlined className="h-[1em] w-[1em]" />
          )}
        </div>
      </button>
      {!collapsedPanel && <PanelContent threadId={threadId} onClearChat={recreateThreadId} />}
      <PanelSplitter panelWidth={panelWidth} setPanelWidth={setPanelWidth} />
    </div>
  );
}
