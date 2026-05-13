import React from 'react';

import { useFileAttachments } from '../../hooks/use-file-attachments';
import Prompt from '../../prompt';

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
}: FooterProps) {
  const [prompt, setPrompt] = React.useState('');
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
        disabled={!threadId || isUploading}
        isStreaming={isStreaming(status) || !!isUploading}
        onCancel={stop}
        attachments={attachments}
        onAddFiles={addFiles}
        onRemoveAttachment={removeAttachment}
        onPaste={handlePaste}
      />
    </footer>
  );
}
