'use client';

import React from 'react';
import { UIMessage } from '@ai-sdk/ui-utils';
import styles from './collapsible-message.module.css';

interface CollapsibleMessageProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  children: React.ReactNode[];
}

export function CollapsibleMessage({ message, status, children }: CollapsibleMessageProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);
  const [hasCollapsed, setHasCollapsed] = React.useState(false);
  const [isAnimating, setIsAnimating] = React.useState(false);

  // Find the last text part index
  const lastTextIndex = React.useMemo(() => {
    for (let i = message.parts.length - 1; i >= 0; i--) {
      const part = message.parts[i];
      if (part.type === 'text' && 'text' in part && part.text !== '') {
        return i;
      }
    }
    return -1;
  }, [message.parts]);

  // Auto-collapse when streaming finishes with smooth animation
  React.useEffect(() => {
    if (status === 'ready' && !hasCollapsed && lastTextIndex > 0) {
      // Start animation
      setIsAnimating(true);
      
      // Wait for fade-out animation to complete before collapsing
      const timer = setTimeout(() => {
        setIsCollapsed(true);
        setHasCollapsed(true);
        setIsAnimating(false);
      }, 300); // Match the CSS animation duration

      return () => clearTimeout(timer);
    }
  }, [status, hasCollapsed, lastTextIndex]);

  // If there's no content to collapse (only one text part or no text parts), render normally
  if (lastTextIndex <= 0) {
    return <>{children}</>;
  }

  // During streaming, show everything normally
  if (status === 'streaming' || status === 'submitted') {
    return <>{children}</>;
  }

  // After streaming is complete, show the collapsible UI
  const collapsibleChildren = children.slice(0, lastTextIndex);
  const finalTextChild = children[lastTextIndex];

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {hasCollapsed ? (
        <div className={styles.thinkingContainer}>
          <button
            type="button"
            className={styles.thinkingButton}
            onClick={toggleCollapse}
            aria-expanded={!isCollapsed}
            data-collapsed={isCollapsed}
          >
            <div className={styles.thinkingHeader}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={styles.chevron}
                data-collapsed={isCollapsed}
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
                Show details
              </span>
            </div>
          </button>
          {!isCollapsed && (
            <div className={styles.thinkingContent}>
              {collapsibleChildren}
            </div>
          )}
        </div>
      ) : (
        <div className={isAnimating ? styles.fadeOut : ''}>
          {collapsibleChildren}
        </div>
      )}
      {finalTextChild}
    </>
  );
}
