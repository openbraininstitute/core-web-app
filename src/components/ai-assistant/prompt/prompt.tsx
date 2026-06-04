'use client';

import { RiAttachment2 } from '@remixicon/react';
import { useCallback, useRef, useState } from 'react';

import SendIcon from '@/components/icons/Send';
import StopIcon from '@/components/icons/Stop';
import { classNames } from '@/util/utils';

import { AttachmentPreview } from './attachment-preview';

import type React from 'react';
import type { FileAttachment } from '../hooks/use-file-attachments';

import styles from './prompt.module.css';

interface PromptProps {
  className?: string;
  value: string;
  onChange(value: string): void;
  onClick(value: string): void;
  disabled?: boolean;
  isStreaming?: boolean;
  onCancel?(): void;
  attachments?: FileAttachment[];
  onAddFiles?: (files: FileList | File[]) => void;
  onRemoveAttachment?: (id: string) => void;
  onPaste?: (e: React.ClipboardEvent) => void;
}

export default function Prompt({
  className,
  value,
  onChange,
  onClick,
  disabled,
  isStreaming,
  onCancel,
  attachments = [],
  onAddFiles,
  onRemoveAttachment,
  onPaste,
}: PromptProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const dragCounterRef = useRef(0);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current += 1;
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragOver(true);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounterRef.current = 0;
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0 && onAddFiles) {
        onAddFiles(files);
      }
    },
    [onAddFiles]
  );

  const handleSendClick = () => {
    const promptText = value.trim();
    if (promptText.length > 0 || attachments.length > 0) onClick(promptText);
  };
  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter' && !evt.shiftKey && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!isStreaming) {
        handleSendClick();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && onAddFiles) {
      onAddFiles(e.target.files);
    }
    e.target.value = '';
  };

  return (
    <div
      className={classNames(className, styles.prompt, isDragOver && styles.dragOver)}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-to-focus delegates to textarea */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-focus delegates to textarea */}
      <div className={styles.inputWrapper} onClick={() => textareaRef.current?.focus()}>
        <AttachmentPreview attachments={attachments} onRemove={onRemoveAttachment ?? (() => {})} />
        <div className={styles.input}>
          <div className={styles.content}>{`${value}!`}</div>
          <textarea
            ref={textareaRef}
            data-testid="ai-chat-input"
            placeholder="What would you like to do?"
            // biome-ignore lint/a11y/noAutofocus: Autofocus
            autoFocus
            value={value}
            onChange={(evt) => onChange(evt.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={onPaste}
          />
        </div>
      </div>
      <div className={styles.actions}>
        {onAddFiles && (
          <>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
              onChange={handleFileChange}
              className={styles.hiddenFileInput}
              multiple
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={styles.attachButton}
              aria-label="Attach file"
              title="Attach file"
            >
              <RiAttachment2 size={20} />
            </button>
          </>
        )}
        {isStreaming ? (
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancel"
            className={styles.stopButton}
          >
            <StopIcon />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSendClick}
            aria-label="Send prompt"
            disabled={(value.trim().length === 0 && attachments.length === 0) || disabled}
          >
            {disabled ? <div className={styles.spinner} /> : <SendIcon />}
          </button>
        )}
      </div>
    </div>
  );
}
