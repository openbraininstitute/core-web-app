import React from 'react';

import { useAITools } from '@/services/ai-agent/tools/tools';

import Prompt from '../../prompt';

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

const isStreaming = (status: FooterProps['status']) =>
  status === 'streaming' || status === 'submitted';

export default function Footer({ className, status, onPrompt, stop, threadId }: FooterProps) {
  const tools = useAITools();
  const [prompt, setPrompt] = React.useState('');
  const handlePrompt = (value: string) => {
    onPrompt(value);
    setPrompt('');
  };

  return (
    <footer className={className}>
      <Prompt
        value={prompt}
        tools={tools ?? []}
        onChange={setPrompt}
        onClick={handlePrompt}
        disabled={!threadId}
        isStreaming={isStreaming(status)}
        onCancel={stop}
      />
    </footer>
  );
}
