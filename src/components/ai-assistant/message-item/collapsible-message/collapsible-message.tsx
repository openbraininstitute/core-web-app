'use client';

import { RiCheckLine, RiCloseLine, RiResetLeftLine } from '@remixicon/react';
import { getToolName, isToolUIPart } from 'ai';
import { useAtomValue } from 'jotai';
import React from 'react';

import { isChatReadyAtom } from '@/services/ai-agent/hooks/chat';
import {
  messageSubmittedCounterAtom,
  restorePreviewMessageIdAtom,
} from '@/state/config-highlights';
import { cn } from '@/utils/css-class';

import type { UIMessage } from '@ai-sdk/react';

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
  const mountedAsReady = React.useRef(status === 'ready');

  const [collapsedIndices, setCollapsedIndices] = React.useState<Set<number>>(() => {
    if (status !== 'ready') return new Set();

    const parts = message.parts;
    let lastTextIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.type === 'text' && 'text' in part && part.text !== '') {
        lastTextIndex = i;
        break;
      }
    }

    if (lastTextIndex <= 0) return new Set();

    const initial = new Set<number>();
    for (let i = 0; i < lastTextIndex; i++) {
      initial.add(i);
    }
    return initial;
  });
  const [animatingIndices, setAnimatingIndices] = React.useState<Set<number>>(new Set());
  const [isConfirmingRestore, setIsConfirmingRestore] = React.useState(false);
  const previousPartsLength = React.useRef(0);

  const submittedCounter = useAtomValue(messageSubmittedCounterAtom);
  const isChatReady = useAtomValue(isChatReadyAtom);
  const restorePreviewMessageId = useAtomValue(restorePreviewMessageIdAtom);
  const prevCounterRef = React.useRef(submittedCounter);

  React.useEffect(() => {
    if (submittedCounter > prevCounterRef.current) {
      setIsConfirmingRestore(false);
      onCancelRestore?.();
    }
    prevCounterRef.current = submittedCounter;
  }, [submittedCounter, onCancelRestore]);

  React.useEffect(() => {
    if (isConfirmingRestore && restorePreviewMessageId && restorePreviewMessageId !== message.id) {
      setIsConfirmingRestore(false);
    }
  }, [restorePreviewMessageId, isConfirmingRestore, message.id]);

  const stepCount = React.useMemo(() => {
    const parts = message.parts;
    let count = 0;
    let inToolSequence = false;

    for (let i = 0; i < parts.length; i++) {
      if (collapsedIndices.has(i)) {
        const part = parts[i];

        if (isToolUIPart(part)) {
          if (!inToolSequence) {
            count++;
            inToolSequence = true;
          }
        } else if (part.type === 'text' && 'text' in part && part.text !== '') {
          inToolSequence = false;
        }
      }
    }

    return count;
  }, [message.parts, collapsedIndices]);

  const hasCompletedEditState = React.useMemo(() => {
    if (!hasEditStateCalls) return false;

    const parts = message.parts;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (
        isToolUIPart(part) &&
        getToolName(part) === 'editstate' &&
        part.state === 'output-available'
      ) {
        return true;
      }
    }
    return false;
  }, [message.parts, hasEditStateCalls]);

  React.useEffect(() => {
    const parts = message.parts;
    const newCollapsedIndices = new Set<number>();

    let lastTextIndex = -1;
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      if (part.type === 'text' && 'text' in part && part.text !== '') {
        lastTextIndex = i;
        break;
      }
    }

    if (status === 'streaming' && parts.length > previousPartsLength.current) {
      const newPartIndex = parts.length - 1;
      const newPart = parts[newPartIndex];

      if (newPart.type === 'text' && 'text' in newPart && newPartIndex > 0) {
        const toAnimate = new Set<number>();
        const updatedCollapsed = new Set(collapsedIndices);

        for (let i = 0; i < newPartIndex; i++) {
          if (!collapsedIndices.has(i) && !animatingIndices.has(i)) {
            toAnimate.add(i);
          }
          updatedCollapsed.add(i);
        }

        if (toAnimate.size > 0) {
          setAnimatingIndices(toAnimate);
          setTimeout(() => {
            setCollapsedIndices(updatedCollapsed);
            setAnimatingIndices(new Set());
          }, 350);
        } else {
          setCollapsedIndices(updatedCollapsed);
        }
      }
    }

    if (status === 'ready' && lastTextIndex > 0 && collapsedIndices.size === 0) {
      for (let i = 0; i < lastTextIndex; i++) {
        newCollapsedIndices.add(i);
      }
      setCollapsedIndices(newCollapsedIndices);
    }

    previousPartsLength.current = parts.length;
  }, [message.parts, status, collapsedIndices, animatingIndices]);

  const collapsedChildren: React.ReactNode[] = [];
  const visibleChildren: React.ReactNode[] = [];

  children.forEach((child, index) => {
    if (collapsedIndices.has(index)) {
      collapsedChildren.push(<div key={`collapsed-${index}`}>{child}</div>);
    } else if (animatingIndices.has(index)) {
      visibleChildren.push(
        <div
          key={`animating-${index}`}
          className={styles.slideToCollapsible}
          data-collapsing="true"
        >
          {child}
        </div>
      );
    } else {
      visibleChildren.push(child);
    }
  });

  const [isExpanded, setIsExpanded] = React.useState(false);
  const showRestore = hasCompletedEditState && isChatReady;

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {(collapsedChildren.length > 0 || animatingIndices.size > 0) && (
        <div className={styles.thinkingContainerWrapper} data-instant={mountedAsReady.current}>
          <div
            className={styles.thinkingContainer}
            data-receiving={animatingIndices.size > 0}
            data-collapsible="true"
            data-instant={mountedAsReady.current}
          >
            <div
              role="button"
              tabIndex={0}
              className={styles.thinkingButton}
              onClick={toggleExpanded}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleExpanded();
                }
              }}
              aria-expanded={isExpanded}
              data-collapsed={!isExpanded}
            >
              <div className={styles.thinkingHeader}>
                <div className={styles.thinkingLabelContainer}>
                  <svg
                    width="14"
                    height="14"
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
                    {isExpanded ? `Hide reasoning (${stepCount})` : `Show reasoning (${stepCount})`}
                  </span>
                </div>
                {showRestore && (
                  <div className={styles.headerActions}>
                    {isConfirmingRestore ? (
                      <>
                        <button
                          type="button"
                          className={cn(styles.confirmBtn, styles.confirmBtnYes)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsConfirmingRestore(false);
                            onConfirmRestore?.();
                          }}
                          aria-label="Confirm restore"
                        >
                          <RiCheckLine size={13} />
                          <span>Yes, restore</span>
                        </button>
                        <button
                          type="button"
                          className={cn(styles.confirmBtn, styles.confirmBtnNo)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsConfirmingRestore(false);
                            onCancelRestore?.();
                          }}
                          aria-label="Cancel restore"
                        >
                          <RiCloseLine size={13} />
                          <span>Cancel</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.restoreBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsConfirmingRestore(true);
                          onPreviewRestore?.();
                        }}
                        aria-label="Restore state"
                        title="Restore to this state"
                      >
                        <RiResetLeftLine size={14} />
                        <span>Restore</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div
              className={`${styles.thinkingContent} ${isExpanded ? styles.thinkingContentExpanded : ''}`}
            >
              <div className={styles.thinkingContentInner}>{collapsedChildren}</div>
            </div>
          </div>
        </div>
      )}
      <div className={styles.contentWrapper} data-visible-tools="true">
        {visibleChildren}
      </div>
    </>
  );
}
