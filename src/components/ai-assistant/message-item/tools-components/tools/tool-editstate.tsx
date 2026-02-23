'use client';

import React from 'react';
import { ToolInvocationUIPart } from '@ai-sdk/ui-utils';
import { useAtom } from 'jotai';
import { configStateAtom } from '@/services/ai-agent/hooks/chat';
import type { Config } from '@/features/scan-config/components/components';
import styles from './tool-editstate.module.css';

interface ToolEditStateProps {
  part: ToolInvocationUIPart | null;
  previousState: unknown | null;
}

export default function ToolEditState({ part, previousState }: ToolEditStateProps) {
  const [, setConfig] = useAtom(configStateAtom);

  if (!part || part.toolInvocation.state !== 'result') {
    return null;
  }

  const handleUndo = () => {
    if (previousState) {
      setConfig(previousState as Config);
    }
  };

  return (
    <div className={styles.container}>
      <button
        type="button"
        className={styles.undoButton}
        onClick={handleUndo}
        disabled={!previousState}
        title={previousState ? 'Restore previous state' : 'No previous state available'}
      >
        <svg
          className={styles.undoIcon}
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M3.5 8C3.5 5.51472 5.51472 3.5 8 3.5C10.4853 3.5 12.5 5.51472 12.5 8C12.5 10.4853 10.4853 12.5 8 12.5C6.5 12.5 5.2 11.8 4.5 10.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M3.5 6V8H5.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Undo
      </button>
    </div>
  );
}
