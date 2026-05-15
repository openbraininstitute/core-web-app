import { useAtom } from 'jotai';
import React from 'react';

import Prompt from '../../prompt';
import { draftPromptAtom } from '../../state';

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
  const [prompt, setPrompt] = React.useState('');
  const [draftPrompt, setDraftPrompt] = useAtom(draftPromptAtom);

  // Pick up externally-set draft prompt (e.g. from "Edit with chat" button)
  React.useEffect(() => {
    if (draftPrompt) {
      setPrompt(draftPrompt);
      setDraftPrompt('');
    }
  }, [draftPrompt, setDraftPrompt]);

  const handlePrompt = (value: string) => {
    onPrompt(value);
    setPrompt('');
  };

  return (
    <footer className={className}>
      <Prompt
        value={prompt}
        onChange={setPrompt}
        onClick={handlePrompt}
        disabled={!threadId}
        isStreaming={isStreaming(status)}
        onCancel={stop}
      />
    </footer>
  );
}
