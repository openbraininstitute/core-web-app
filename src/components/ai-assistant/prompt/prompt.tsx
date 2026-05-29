'use client';

import { RiAttachment2 } from '@remixicon/react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import SendIcon from '@/components/icons/Send';
import StopIcon from '@/components/icons/Stop';
import { classNames } from '@/util/utils';

import { AttachmentPreview } from './attachment-preview';

import type React from 'react';
import type { FileAttachment } from '../hooks/use-file-attachments';

import styles from './prompt.module.css';

// Horizontal space reserved for attach + send + gaps in compact mode:
//   attach(28) + gap(2) + gap(2) + send(34) = 66
const RESERVED = 66;
const DURATION = 220;

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
  const mainRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const dragCounterRef = useRef(0);
  const expandedRef = useRef(false);
  const fromHeightRef = useRef<number | null>(null);

  // --- Textarea auto-grow ---
  const fitTextarea = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, []);

  // --- Measure: decide compact vs expanded ---
  const measure = useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    const main = mainRef.current;
    if (!ta || !mirror || !main) return;

    const lineHeight = parseFloat(getComputedStyle(ta).lineHeight) || 21;

    // Always measure at the compact width so the decision can't oscillate.
    const compactWidth = Math.max(40, main.clientWidth - RESERVED);
    mirror.style.width = `${compactWidth}px`;
    mirror.textContent = value.length ? value : 'x';

    const lines = Math.max(1, Math.round(mirror.scrollHeight / lineHeight));
    const wouldWrap = lines > 1;

    // Expand when text wraps; collapse only when input is fully cleared.
    const next = wouldWrap || (expandedRef.current && value.length > 0);

    fitTextarea();

    if (next !== expandedRef.current) {
      // Capture the height in the OLD layout for the height FLIP.
      fromHeightRef.current = main.scrollHeight;
      expandedRef.current = next;
      setExpanded(next);
    }
  }, [value, fitTextarea]);

  // Re-measure on text change and attachment count change
  useLayoutEffect(measure, [measure, attachments.length]);

  // Re-measure on container resize
  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(main);
    return () => ro.disconnect();
  }, [measure]);

  // --- Height-reveal animation (FLIP) ---
  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;

    fitTextarea();

    const from = fromHeightRef.current;
    const to = main.scrollHeight;
    if (from == null || Math.abs(from - to) < 1) return;
    fromHeightRef.current = null;

    // Respect prefers-reduced-motion: skip the tween, snap instantly
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    main.style.height = `${from}px`;
    main.getBoundingClientRect(); // force reflow
    main.style.height = `${to}px`;

    const done = (e?: TransitionEvent) => {
      if (e && e.propertyName !== 'height') return;
      main.style.height = '';
      main.removeEventListener('transitionend', done);
    };
    main.addEventListener('transitionend', done);
    const fallback = setTimeout(() => done(), DURATION + 60);
    return () => clearTimeout(fallback);
  }, [expanded, fitTextarea]);

  // --- Drag and drop ---
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

  // --- Send ---
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
      <AttachmentPreview attachments={attachments} onRemove={onRemoveAttachment ?? (() => {})} />

      {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-to-focus delegates to textarea */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: click-to-focus delegates to textarea */}
      <div
        ref={mainRef}
        className={classNames(styles.main, expanded && styles.expanded)}
        onClick={() => textareaRef.current?.focus()}
      >
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          placeholder="What would you like to do?"
          // biome-ignore lint/a11y/noAutofocus: Autofocus
          autoFocus
          rows={1}
          value={value}
          onChange={(evt) => onChange(evt.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={onPaste}
        />

        <div className={styles.leftActions}>
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
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className={styles.attachButton}
                aria-label="Attach file"
                title="Attach file"
              >
                <RiAttachment2 size={20} />
              </button>
            </>
          )}
        </div>

        <div className={styles.rightActions}>
          {isStreaming ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onCancel?.();
              }}
              aria-label="Cancel"
              className={styles.stopButton}
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleSendClick();
              }}
              aria-label="Send prompt"
              className={styles.sendButton}
              disabled={(value.trim().length === 0 && attachments.length === 0) || disabled}
            >
              {disabled ? <div className={styles.spinner} /> : <SendIcon />}
            </button>
          )}
        </div>
      </div>

      {/* Hidden mirror for measuring text width (compact-mode line count) */}
      <div ref={mirrorRef} className={styles.mirror} aria-hidden="true" />
    </div>
  );
}
