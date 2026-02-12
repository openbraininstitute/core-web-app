import React from 'react';

import { useAITools } from '@/services/ai-agent/tools/tools';

import Prompt from '../../prompt';
import { WaveLoader } from '../../wave-loader';

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

export default function Footer({ className, status, onPrompt, stop, threadId }: FooterProps) {
  const tools = useAITools();
  const [prompt, setPrompt] = React.useState('');
  const handlePrompt = (value: string) => {
    onPrompt(value);
    setPrompt('');
  };

  return (
    <footer className={className}>
      {(status === 'ready' || status === 'error') && (
        <Prompt
          value={prompt}
          tools={tools ?? []}
          onChange={setPrompt}
          onClick={handlePrompt}
          disabled={!threadId}
        />
      )}
      {status !== 'ready' && status !== 'error' && (
        <div className={styles.spinnerContainer}>
          <WaveLoader />
          {(status === 'streaming' || status === 'submitted') && (
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
