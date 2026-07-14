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

const COLLAPSE_ANIMATION_MS = 350;

interface CollapsibleMessageProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  children: React.ReactNode[];
  onPreviewRestore?: () => void;
  onConfirmRestore?: () => void;
  onCancelRestore?: () => void;
  hasEditStateCalls?: boolean;
}

/**
 * Index of the LAST `step-start` part that already has visible content
 * (text or tool-invocation) after it. This avoids collapsing the previous step
 * while the model is still only emitting reasoning tokens in the new step,
 * which would otherwise show a blank area to the user.
 */
function findLastVisibleStepStart(parts: UIMessage['parts']): number {
  let lastStepStart = -1;
  let lastVisibleStepStart = -1;

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.type === 'step-start') {
      lastStepStart = i;
    } else if (
      lastStepStart !== lastVisibleStepStart &&
      ((part.type === 'text' && 'text' in part && part.text !== '') ||
        part.type === 'tool-invocation' ||
        isToolUIPart(part))
    ) {
      // The current step has produced visible content — mark it as the boundary.
      lastVisibleStepStart = lastStepStart;
    }
  }

  return lastVisibleStepStart;
}

/** Number of `step-start` parts strictly before `index`. */
function countStepsBefore(parts: UIMessage['parts'], index: number): number {
  let count = 0;
  for (let i = 0; i < Math.min(index, parts.length); i++) {
    if (parts[i].type === 'step-start') count++;
  }
  return count;
}

function hasCompletedEditState(parts: UIMessage['parts']): boolean {
  return parts.some(
    (p) => isToolUIPart(p) && getToolName(p) === 'editstate' && p.state === 'output-available'
  );
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

  // Boundary between collapsed (prior steps) and visible (current/last step).
  // Only advances once the new step has produced visible content (text/tool),
  // so reasoning-only phases don't cause a blank visible area.
  const lastStepStartIndex = React.useMemo(
    () => findLastVisibleStepStart(message.parts),
    [message.parts]
  );

  // Indices currently sliding from the visible area into the collapsible during streaming.
  const [animatingIndices, setAnimatingIndices] = React.useState<Set<number>>(new Set());
  const previousStepStartRef = React.useRef(lastStepStartIndex);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const isExpandedRef = React.useRef(isExpanded);
  isExpandedRef.current = isExpanded;

  // Synchronously detect new step boundary and compute animating indices during render
  // to avoid a blank frame where items move to collapsed before the animation wrapper appears.
  // We track whether we need to schedule the timeout via a ref so the effect can pick it up.
  const pendingAnimationRef = React.useRef(false);

  if (
    (status === 'streaming' || status === 'submitted') &&
    lastStepStartIndex > previousStepStartRef.current &&
    !isExpandedRef.current
  ) {
    const previous = previousStepStartRef.current;
    const toAnimate = new Set<number>();
    for (let i = Math.max(0, previous); i < lastStepStartIndex; i++) {
      toAnimate.add(i);
    }
    if (toAnimate.size > 0 && animatingIndices.size === 0) {
      // setState during render is fine in React 18+ when the value differs
      setAnimatingIndices(toAnimate);
      pendingAnimationRef.current = true;
    }
    previousStepStartRef.current = lastStepStartIndex;
  } else if (lastStepStartIndex !== previousStepStartRef.current) {
    previousStepStartRef.current = lastStepStartIndex;
  }

  // Schedule cleanup timeout after animation completes
  React.useEffect(() => {
    if (!pendingAnimationRef.current) return undefined;
    pendingAnimationRef.current = false;
    const timer = setTimeout(() => setAnimatingIndices(new Set()), COLLAPSE_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [animatingIndices]);

  // ── Restore confirmation ─────────────────────────────────────────────────
  const [isConfirmingRestore, setIsConfirmingRestore] = React.useState(false);
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

  const showRestore = React.useMemo(
    () => hasEditStateCalls && isChatReady && hasCompletedEditState(message.parts),
    [hasEditStateCalls, isChatReady, message.parts]
  );

  // ── Layout ───────────────────────────────────────────────────────────────
  const stepCount = React.useMemo(
    () => countStepsBefore(message.parts, lastStepStartIndex),
    [message.parts, lastStepStartIndex]
  );

  const collapsedChildren: React.ReactNode[] = [];
  const visibleChildren: React.ReactNode[] = [];

  children.forEach((child, index) => {
    if (child === null || child === undefined) return;

    if (animatingIndices.has(index)) {
      visibleChildren.push(
        <div
          key={`animating-${index}`}
          className={styles.slideToCollapsible}
          data-collapsing="true"
        >
          {child}
        </div>
      );
    } else if (index < lastStepStartIndex) {
      collapsedChildren.push(<div key={`collapsed-${index}`}>{child}</div>);
    } else {
      visibleChildren.push(child);
    }
  });

  const toggleExpanded = () => {
    const next = !isExpanded;
    setIsExpanded(next);
    // If expanding while items are mid-animation, cancel the animation immediately
    // so they appear in the collapsible content without a jump.
    if (next && animatingIndices.size > 0) {
      setAnimatingIndices(new Set());
    }
  };
  const showCollapsibleContainer = collapsedChildren.length > 0 || animatingIndices.size > 0;

  return (
    <>
      {showCollapsibleContainer && (
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
