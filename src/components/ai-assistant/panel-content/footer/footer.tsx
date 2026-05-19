import { useAtom } from 'jotai';

import Prompt from '../../prompt';
import { promptAtom } from '../../state';

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
  const [prompt, setPrompt] = useAtom(promptAtom);

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
