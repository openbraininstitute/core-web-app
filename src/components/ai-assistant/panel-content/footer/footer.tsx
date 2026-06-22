import { useAtom } from 'jotai';

import { useFileAttachments } from '../../hooks/use-file-attachments';
import Prompt from '../../prompt';
import { promptAtom } from '../../state';

import type { FileAttachment } from '../../hooks/use-file-attachments';

interface FooterProps {
  className?: string;
  status: 'ready' | 'error' | 'streaming' | 'submitted';
  threadId: string | undefined;
  onPrompt(prompt: string, files?: File[]): void;
  messagesCount: number;
  stop(): void;
  isLoadingSuggestions?: boolean;
  isUploading?: boolean;
  hasUnresolvedApprovals?: boolean;
}

const isStreaming = (status: FooterProps['status']) =>
  status === 'streaming' || status === 'submitted';

export default function Footer({
  className,
  status,
  onPrompt,
  stop,
  threadId,
  isUploading,
  hasUnresolvedApprovals,
}: FooterProps) {
  const [prompt, setPrompt] = useAtom(promptAtom);
  const { attachments, addFiles, removeAttachment, clearAttachments, handlePaste } =
    useFileAttachments();

  const handlePrompt = (value: string) => {
    const files =
      attachments.length > 0 ? attachments.map((a: FileAttachment) => a.file) : undefined;
    onPrompt(value, files);
    setPrompt('');
    clearAttachments();
  };

  return (
    <footer className={className}>
      <Prompt
        value={prompt}
        onChange={setPrompt}
        onClick={handlePrompt}
        disabled={!threadId || isUploading || hasUnresolvedApprovals}
        isStreaming={isStreaming(status) || !!isUploading || !!hasUnresolvedApprovals}
        onCancel={stop}
        attachments={attachments}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
        onPaste={handlePaste}
      />
    </footer>
  );
}
