import React from 'react';

import Spinner from '../Spinner';
import { useLitteratureCrawler, useThreadId } from './hooks';
import SuggestedQuestions from './suggested-questions';
import MessageItem from './message-item';
import Prompt from './prompt';
import { classNames } from '@/util/utils';

import styles from './litterature-suggestions.module.css';

export interface LitteratureSuggestionsProps {
  className?: string;
}

export default function LitteratureSuggestions({ className }: LitteratureSuggestionsProps) {
  const refChatBottom = React.useRef<HTMLDivElement | null>(null);
  const threadId = useThreadId();
  const [prompt, setPrompt] = React.useState('');
  const { messages, status, append, error } = useLitteratureCrawler(threadId);
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
    refChatBottom.current?.scrollIntoView();
  }, [messages]);

  return (
    <div className={classNames(className, styles.litteratureSuggestions)}>
      <h1>Explore AI</h1>
      {threadId ? (
        <>
          {error ? (
            <div className={styles.error}>{JSON.stringify(error, null, '  ')}</div>
          ) : (
            <div className={styles.articles}>
              {messages.map((item) => (
                <MessageItem key={item.id} value={item} />
              ))}
              {status !== 'ready' && <Spinner />}
              <div ref={refChatBottom} className={styles.bottom} />
            </div>
          )}
          <footer>
            {messages.length === 0 && (
              <SuggestedQuestions
                onClick={(selectedPrompt) => {
                  setPrompt(selectedPrompt);
                  handleQuery(selectedPrompt);
                }}
              />
            )}
            <Prompt value={prompt} onChange={setPrompt} onClick={handleQuery} />
          </footer>
        </>
      ) : (
        <Spinner>Connecting AI service...</Spinner>
      )}
    </div>
  );
}
