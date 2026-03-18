'use client';

import React from 'react';

import type { UIMessage } from '@ai-sdk/ui-utils';

import styles from './collapsible-message.module.css';

interface CollapsibleMessageProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  children: React.ReactNode[];
}

export function CollapsibleMessage({ message, status, children }: CollapsibleMessageProps) {
  const [collapsedIndices, setCollapsedIndices] = React.useState<Set<number>>(new Set());
  const [animatingIndices, setAnimatingIndices] = React.useState<Set<number>>(new Set());
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
        // Start animation for items that will be collapsed
        const toAnimate = new Set<number>();
        // Preserve existing collapsed items
        const updatedCollapsed = new Set(collapsedIndices);

        for (let i = 0; i < newPartIndex; i++) {
          if (!collapsedIndices.has(i) && !animatingIndices.has(i)) {
            toAnimate.add(i);
          }
          updatedCollapsed.add(i);
        }

        if (toAnimate.size > 0) {
          setAnimatingIndices(toAnimate);
          // Delay actual collapse until animation completes
          setTimeout(() => {
            setCollapsedIndices(updatedCollapsed);
            setAnimatingIndices(new Set());
          }, 350);
        } else {
          setCollapsedIndices(updatedCollapsed);
        }
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
  }, [message.parts, status, collapsedIndices, animatingIndices]);

  // Separate collapsed, animating, and visible children
  const collapsedChildren: React.ReactNode[] = [];
  const visibleChildren: React.ReactNode[] = [];

  children.forEach((child, index) => {
    if (collapsedIndices.has(index)) {
      collapsedChildren.push(<div key={`collapsed-${index}`}>{child}</div>);
    } else if (animatingIndices.has(index)) {
      // Show animating items in visible area with animation
      visibleChildren.push(
        <div key={`animating-${index}`} className={styles.slideToCollapsible}>
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
        <div
          className={styles.thinkingContainer}
          data-receiving={animatingIndices.size > 0}
          data-collapsible="true"
        >
          <button
            type="button"
            className={styles.thinkingButton}
            onClick={toggleExpanded}
            aria-expanded={isExpanded}
            data-collapsed={!isExpanded}
          >
            <div className={styles.thinkingHeader}>
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
                {isExpanded ? `Hide steps (${stepCount})` : `Show steps (${stepCount})`}
              </span>
            </div>
          </button>
          {isExpanded && <div className={styles.thinkingContent}>{collapsedChildren}</div>}
        </div>
      )}
      <div className={styles.contentWrapper}>{visibleChildren}</div>
    </>
  );
}
