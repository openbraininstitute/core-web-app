'use client';

import { MinusOutlined, PlusOutlined } from '@ant-design/icons';
import React, { CSSProperties } from 'react';

import ErrorPanel from './error';
import MessageItem from './message-item';
import Prompt from './prompt';
import { Spinner } from './spinner';
import SuggestedQuestions from './suggested-questions';
import { useCollapsedPanel } from './hooks';
import { IconClear } from './icons/clear';
import PanelSplitter from './panel-splitter';
import { classNames } from '@/util/utils';
import { useServiceAiAgentChat, useServiceAiAgentThread } from '@/services/ai-agent';
import { useAITools } from '@/services/ai-agent/tools/tools';
import { useLocalStorage } from '@/util/storage';
import { isNumber } from '@/util/type-guards';

import styles from './ai-assistant.module.css';
import { IconFullscreenOff } from './icons/fullscreen-off';
import { IconFullscreenOn } from './icons/fullscreen-on';

export interface LiteratureSuggestionsProps {
  className?: string;
}

export default function ArtificialIntelligenceAssistant({ className }: LiteratureSuggestionsProps) {
  const tools = useAITools();
  const [panelWidth, setPanelWidth] = useLocalStorage('ai-assistant/panel-width', 25, isNumber);
  const [collapsedPanel, setCollapsedPanel] = useCollapsedPanel();
  const [fullscreen, setFullscreen] = React.useState(false);
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const [threadId, recreateThreadId] = useServiceAiAgentThread();
  const [prompt, setPrompt] = React.useState('');
  const { messages, clear, status, append, error, stop } = useServiceAiAgentChat(threadId ?? '');

  const handleQuery = React.useCallback(
    (content: string) => {
      append({
        role: 'user',
        content,
      });
      setPrompt('');
    },
    [append]
  );
  React.useEffect(() => {
    globalThis.setTimeout(() => refChatBottom.current?.scrollIntoView(), 200);
  }, [messages, error]);
  const handleClearChat = () => {
    clear();
    recreateThreadId();
  };
  const style: CSSProperties = {
    '--custom-panel-width': `${panelWidth.toFixed(2)}vw`,
  };
  const handleToggleFullscreen = (evt: React.MouseEvent<HTMLButtonElement>) => {
    evt.stopPropagation();
    evt.preventDefault();
    setFullscreen(!fullscreen);
  };
  const handleToggleCollapse = () => {
    if (fullscreen) setFullscreen(false);
    else setCollapsedPanel(!collapsedPanel);
  };

  return (
    <div
      style={style}
      className={classNames(className, styles.aiAssistant, fullscreen && styles.fullscreen)}
      data-collapsed={collapsedPanel}
    >
      <button className={styles.header} type="button" onClick={handleToggleCollapse}>
        <h1 title={status}>AI Assistant</h1>
        <div className={styles.icons}>
          {!collapsedPanel && (
            <button type="button" onClick={handleToggleFullscreen}>
              {fullscreen ? <IconFullscreenOff /> : <IconFullscreenOn />}
            </button>
          )}
          {!fullscreen &&
            (collapsedPanel ? (
              <PlusOutlined className="h-[1em] w-[1em]" />
            ) : (
              <MinusOutlined className="w-[1em]" />
            ))}
        </div>
      </button>
      {!collapsedPanel && (
        <>
          {messages.length === 0 && (
            <div className={styles.welcome}>
              <div>
                <p>Welcome to the OBI platform! </p>
                <p>
                  I&apos;m here to help with your literature searches, and soon, I&apos;ll assist
                  you in exploring our database and setting up your own simulations.
                </p>
              </div>
            </div>
          )}
          {threadId && tools ? (
            <>
              <div className={styles.articles}>
                {messages.map((item, messageIndex) => (
                  <MessageItem
                    key={item.id}
                    value={item}
                    hideTools={messageIndex === messages.length - 1 && status !== 'ready'}
                  />
                ))}
                {status === 'ready' && messages.length > 0 && (
                  <div className={styles.footerButtons}>
                    <button type="button" className={styles.actionButton} onClick={handleClearChat}>
                      <IconClear />
                      <div>Clear chat</div>
                    </button>
                  </div>
                )}
                {error && <ErrorPanel value={error} />}
                <div ref={refChatBottom} className={styles.bottom} />
              </div>

              <footer>
                {status === 'ready' && (
                  <SuggestedQuestions
                    threadId={threadId}
                    messagesLength={messages.length}
                    onClick={(selectedPrompt) => {
                      setPrompt(selectedPrompt);
                      handleQuery(selectedPrompt);
                    }}
                  />
                )}
                {(status === 'ready' || status === 'error') && (
                  <Prompt value={prompt} tools={tools} onChange={setPrompt} onClick={handleQuery} />
                )}
                {status !== 'ready' && status !== 'error' && (
                  <div className={styles.spinnerContainer}>
                    <Spinner />
                    {status === 'streaming' && (
                      <button className={styles.cancelButton} type="button" onClick={stop}>
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </footer>
            </>
          ) : (
            status !== 'error' && <Spinner />
          )}
        </>
      )}
      <PanelSplitter panelWidth={panelWidth} setPanelWidth={setPanelWidth} />
    </div>
  );
}
