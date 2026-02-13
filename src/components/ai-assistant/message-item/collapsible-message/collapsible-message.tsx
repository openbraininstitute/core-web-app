'use client';

import React from 'react';
import { UIMessage, ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { useAITools } from '@/services/ai-agent/tools/tools';
import styles from './collapsible-message.module.css';

interface CollapsibleMessageProps {
  message: UIMessage;
  status: 'submitted' | 'streaming' | 'ready' | 'error';
  children: React.ReactNode[];
}

export function CollapsibleMessage({ message, status, children }: CollapsibleMessageProps) {
  const [collapsedIndices, setCollapsedIndices] = React.useState<Set<number>>(new Set());
  const [animatingIndex, setAnimatingIndex] = React.useState<number | null>(null);
  const previousPartsLength = React.useRef(0);
  const tools = useAITools();

  // Find the latest tool invocation part in collapsed content
  const latestToolInfo = React.useMemo(() => {
    if (!tools) return null;
    
    const parts = message.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      if (collapsedIndices.has(i) && parts[i].type === 'tool-invocation') {
        const toolPart = parts[i] as ToolInvocationUIPart;
        const toolName = toolPart.toolInvocation.toolName;
        const tool = tools.find((t) => t.id === toolName);
        
        if (tool) {
          const Icon = tool.icon;
          return {
            name: tool.name,
            Icon,
            state: toolPart.toolInvocation.state,
          };
        }
      }
    }
    return null;
  }, [message.parts, collapsedIndices, tools]);

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
      }
    }

    // When streaming finishes, collapse everything except the last text
    if (status === 'ready' && lastTextIndex > 0) {
      for (let i = 0; i < lastTextIndex; i++) {
        newCollapsedIndices.add(i);
      }
    }

    if (newCollapsedIndices.size > 0) {
      setCollapsedIndices(newCollapsedIndices);
    }

    previousPartsLength.current = parts.length;
  }, [message.parts, status, collapsedIndices]);

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
        <div 
          className={styles.thinkingContainer}
          data-receiving={animatingIndex !== null}
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
              {latestToolInfo ? (
                <div className={styles.toolSummary}>
                  <div className={styles.toolIcon}>
                    <latestToolInfo.Icon />
                  </div>
                  <span className={styles.toolName}>{latestToolInfo.name}</span>
                  <span className={styles.toolStatus}>
                    {latestToolInfo.state === 'result' ? 'Complete' : 'Running'}
                  </span>
                </div>
              ) : (
                <span className={styles.thinkingLabel}>
                  Show details
                </span>
              )}
            </div>
          </button>
          {isExpanded && (
            <div className={styles.thinkingContent}>
              {collapsedChildren}
            </div>
          )}
        </div>
      )}
      {visibleChildren}
    </>
  );
}
