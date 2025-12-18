import React from 'react';

import SuggestedQuestions from '../../suggested-questions';
import Prompt from '../../prompt';
import { Spinner } from '../../spinner';

import { useAITools } from '@/services/ai-agent/tools/tools';

import styles from './footer.module.css';

interface FooterProps {
  className?: string;
  status: 'ready' | 'error' | 'streaming' | 'submitted';
  threadId: string | undefined;
  onPrompt(prompt: string): void;
  messagesCount: number;
  stop(): void;
  isLoadingSuggestions?: boolean;
}

export default function Footer({
  className,
  status,
  threadId,
  onPrompt,
  messagesCount,
  stop,
  isLoadingSuggestions,
}: FooterProps) {
  const tools = useAITools();
  const [prompt, setPrompt] = React.useState('');
  const handlePrompt = (value: string) => {
    onPrompt(value);
    setPrompt('');
  };

  return (
    <footer className={className}>
      {status === 'ready' && messagesCount === 0 && (
        <SuggestedQuestions threadId={threadId} messagesLength={0} onClick={handlePrompt} isLoading={isLoadingSuggestions} />
      )}
      {(status === 'ready' || status === 'error') && (
        <Prompt value={prompt} tools={tools ?? []} onChange={setPrompt} onClick={handlePrompt} />
      )}
      {status !== 'ready' && status !== 'error' && (
        <div className={styles.spinnerContainer}>
          <Spinner />
          {status === 'streaming' && (
            <div className={styles.cancelButton}>
              <button type="button" onClick={stop}>
                Cancel
              </button>
            </div>
          )}
        </div>
      )}
    </footer>
  );
}
