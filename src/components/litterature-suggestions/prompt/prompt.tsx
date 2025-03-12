import React from 'react';

import { classNames } from '@/util/utils';
import SendIcon from '@/components/icons/Send';

import styles from './prompt.module.css';

export interface PromptProps {
  className?: string;
  value: string;
  onChange(value: string): void;
  onClick(value: string): void;
}

export default function Prompt({ className, value, onChange, onClick }: PromptProps) {
  const handleClick = () => onClick(value);
  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      handleClick();
    }
  };

  return (
    <div className={classNames(className, styles.prompt)}>
      <div className={styles.input}>
        <div className={styles.content}>{value}</div>
        <textarea
          placeholder="What would you like to do?"
          value={value}
          onChange={(evt) => onChange(evt.target.value)}
          onKeyDown={handleKeyDown}
        />
      </div>
      <button type="button" onClick={handleClick} aria-label="Send prompt">
        <SendIcon />
      </button>
    </div>
  );
}
