'use client';

import React from 'react';

import { IconGear } from '../icons/gear';
import ToolsSelector from './tools-selector';
import { classNames } from '@/util/utils';
import SendIcon from '@/components/icons/Send';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './prompt.module.css';

interface PromptProps {
  className?: string;
  value: string;
  tools: AIAssistantTool[];
  onChange(value: string): void;
  onClick(value: string): void;
}

export default function Prompt({ className, value, tools, onChange, onClick }: PromptProps) {
  const [showToolsSelector, setShowToolsSelector] = React.useState(false);
  const handleSendClick = () => onClick(value);
  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter') {
      handleSendClick();
    }
  };
  const handleToolsClick = () => {
    setShowToolsSelector(true);
  };

  return (
    <>
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
        <button type="button" onClick={handleToolsClick} aria-label="Send prompt">
          <IconGear />
        </button>
        <button type="button" onClick={handleSendClick} aria-label="Send prompt">
          <SendIcon />
        </button>
      </div>
      <ToolsSelector
        open={showToolsSelector}
        tools={tools}
        onClose={() => setShowToolsSelector(false)}
      />
    </>
  );
}
