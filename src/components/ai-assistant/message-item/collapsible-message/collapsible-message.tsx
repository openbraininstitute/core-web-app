'use client';

import React from 'react';
import { RiResetLeftLine, RiCheckLine, RiCloseLine } from '@remixicon/react';

import type { UIMessage } from '@ai-sdk/ui-utils';
import { cn } from '@/utils/css-class';

import styles from './collapsible-message.module.css';

interface CollapsibleMessageProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  children: React.ReactNode[];
  onPreviewRestore?: () => void;
  onConfirmRestore?: () => void;
  onCancelRestore?: () => void;
  hasEditStateCalls?: boolean;
}

export function CollapsibleMessage({ 
  message, 
  status, 
  children,
  onPreviewRestore,
  onConfirmRestore,
  onCancelRestore,
  hasEditStateCalls = false,
}: CollapsibleMessageProps) {
  const [collapsedIndices, setCollapsedIndices] = React.useState<Set<number>>(new Set());
  const [animatingIndex, setAnimatingIndex] = React.useState<number | null>(null);
  const [isConfirmingRestore, setIsConfirmingRestore] = React.useState(false);
  const previousPartsLength = React.useRef(0);

  // Count steps in collapsed content (consecutive tool calls = 1 step)
  const stepCount = React.useMemo(() => {
    const parts = message.parts;
    let count = 0;
    let inToolSequence = false;

    for (let i = 0; i < parts.length; i++) {
      if (collapsedIndices.has(i)) {
        const part = parts[i];

        if (part.type === 'tool-invocation') {
          // If we're not already in a tool sequence, this is a new step
          if (!inToolSequence) {
            count++;
            inToolSequence = true;
          }
          // Otherwise, it's part of the same parallel tool call step
        } else if (part.type === 'text' && 'text' in part && part.text !== '') {
          // Text part ends the tool sequence
          inToolSequence = false;
        }
      }
    }

    return count;
  }, [message.parts, collapsedIndices]);

  // Check if there are COMPLETED editstate calls in the entire message
  const hasCompletedEditState = React.useMemo(() => {
    if (!hasEditStateCalls) return false;

    const parts = message.parts;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (
        part.type === 'tool-invocation' &&
        part.toolInvocation.toolName === 'editstate' &&
        part.toolInvocation.state === 'result'
      ) {
        return true;
      }
    }
    return false;
  }, [message.parts, hasEditStateCalls]);

  // Track which parts should be collapsed
  React.useEffect(() => {
    const parts = message.parts;

    // Find indices that should be collapsed
    // A part should be collapsed if:
    // 1. It's a text or tool-invocation
    // 2. There's at least one more text part after it
    const newCollapsedIndices = new Set<number>();

    // Find the last text part index
    let lastTextIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.type === 'text' && 'text' in part && part.text !== '') {
        lastTextIndex = i;
        break;
      }
    }

    // If we're streaming and a new text part appeared after previous content
    if (status === 'streaming' && parts.length > previousPartsLength.current) {
      // Check if the new part is a text part
      const newPartIndex = parts.length - 1;
      const newPart = parts[newPartIndex];

      if (newPart.type === 'text' && 'text' in newPart && newPartIndex > 0) {
        // Collapse everything before this new text part
        for (let i = 0; i < newPartIndex; i++) {
          if (!collapsedIndices.has(i)) {
            // Trigger animation for newly collapsed items
            setAnimatingIndex(i);
            setTimeout(() => setAnimatingIndex(null), 300);
          }
          newCollapsedIndices.add(i);
        }
        setCollapsedIndices(newCollapsedIndices);
      }
    }

    // When streaming finishes, collapse everything except the last text
    // Only do this once when transitioning to ready
    if (status === 'ready' && lastTextIndex > 0 && collapsedIndices.size === 0) {
      for (let i = 0; i < lastTextIndex; i++) {
        newCollapsedIndices.add(i);
      }
      setCollapsedIndices(newCollapsedIndices);
    }

    previousPartsLength.current = parts.length;
  }, [message.parts, status]);

  // Separate collapsed and visible children
  const collapsedChildren: React.ReactNode[] = [];
  const visibleChildren: React.ReactNode[] = [];

  children.forEach((child, index) => {
    if (collapsedIndices.has(index)) {
      collapsedChildren.push(
        <div
          key={`collapsed-${index}`}
          className={index === animatingIndex ? styles.slideToCollapsible : ''}
        >
          {child}
        </div>
      );
    } else {
      visibleChildren.push(child);
    }
  });

  const [isExpanded, setIsExpanded] = React.useState(false);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {collapsedChildren.length > 0 && (
        <div className={styles.thinkingContainer} data-receiving={animatingIndex !== null}>
          <button
            type="button"
            className={styles.thinkingButton}
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            data-collapsed={!isExpanded}
          >
            <div className={styles.thinkingHeader}>
              <div className={styles.thinkingLabelContainer}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={styles.chevron}
                  data-collapsed={!isExpanded}
                >
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span className={styles.thinkingLabel}>
                  {isExpanded ? `Hide Steps (${stepCount})` : `Show Steps (${stepCount})`}
                </span>
              </div>
              {hasCompletedEditState && status === 'ready' && (
                <div className={styles.actionButtons}>
                  {isConfirmingRestore ? (
                    <>
                      <span className={styles.confirmLabel}>Restore this state?</span>
                      <button
                        type="button"
                        className={cn(styles.actionButton, styles.confirmYes)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfirmingRestore(false);
                          onConfirmRestore?.();
                        }}
                        aria-label="Confirm restore"
                      >
                        <RiCheckLine size={16} />
                        <span>Yes</span>
                      </button>
                      <button
                        type="button"
                        className={cn(styles.actionButton, styles.confirmNo)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfirmingRestore(false);
                          onCancelRestore?.();
                        }}
                        aria-label="Cancel restore"
                      >
                        <RiCloseLine size={16} />
                        <span>No</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirmingRestore(true);
                        onPreviewRestore?.();
                      }}
                      aria-label="Restore state"
                      title="Restore state"
                    >
                      <RiResetLeftLine size={16} />
                      <span>Restore State</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </button>
          {isExpanded && <div className={styles.thinkingContent}>{collapsedChildren}</div>}
        </div>
      )}
      {visibleChildren}
    </>
  );
}
