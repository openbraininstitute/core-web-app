import React from 'react';

import SuggestedQuestions from '../../suggested-questions';
import Prompt from '../../prompt';
import { Spinner } from '../../spinner';

import { useAITools } from '@/services/ai-agent/tools/tools';

import styles from './footer.module.css';

export interface FooterProps {
  status: 'ready' | 'error' | 'streaming' | 'submitted';
  threadId: string | undefined;
  onPrompt(prompt: string): void;
  messagesCount: number;
  stop(): void;
}

export default function Footer({ status, threadId, onPrompt, messagesCount, stop }: FooterProps) {
  const tools = useAITools();
  const [prompt, setPrompt] = React.useState('');
  const handlePrompt = (value: string) => {
    onPrompt(value);
    setPrompt('');
  };

  return (
    <footer>
      {status === 'ready' && (
        <SuggestedQuestions
          threadId={threadId}
          messagesLength={messagesCount}
          onClick={handlePrompt}
        />
      )}
      {(status === 'ready' || status === 'error') && (
        <Prompt value={prompt} tools={tools ?? []} onChange={setPrompt} onClick={handlePrompt} />
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
  );
}
