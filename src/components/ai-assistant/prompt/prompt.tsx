'use client';

import React from 'react';

import SendIcon from '@/components/icons/Send';
import { classNames } from '@/util/utils';

// import { IconGear } from '../icons/gear';
import ToolsSelector from './tools-selector';

import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './prompt.module.css';

interface PromptProps {
  className?: string;
  value: string;
  tools: AIAssistantTool[];
  onChange(value: string): void;
  onClick(value: string): void;
  disabled?: boolean;
}

export default function Prompt({
  className,
  value,
  tools,
  onChange,
  onClick,
  disabled,
}: PromptProps) {
  const [showToolsSelector, setShowToolsSelector] = React.useState(false);

  const handleSendClick = () => {
    const promptText = value.trim();
    if (promptText.length > 0) onClick(promptText);
  };
  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === 'Enter' && !evt.shiftKey && !evt.ctrlKey && !evt.altKey && !evt.metaKey) {
      evt.preventDefault();
      evt.stopPropagation();
      handleSendClick();
    }
  };
  // const handleToolsClick = () => {
  //   setShowToolsSelector(true);
  // };

  return (
    <>
      <div className={classNames(className, styles.prompt)}>
        <div className={styles.input}>
          <div className={styles.content}>{value + '!'}</div>
          <textarea
            placeholder="What would you like to do?"
            // biome-ignore lint/a11y/noAutofocus: Autofocus
            autoFocus
            value={value}
            onChange={(evt) => onChange(evt.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        {/* For now, we remove the tool selector. In the future we will add all of them with categories. */}
        {/* <button type="button" onClick={handleToolsClick} aria-label="Select tools">
          <IconGear />
        </button> */}
        <button
          type="button"
          onClick={handleSendClick}
          aria-label="Send prompt"
          disabled={value.trim().length === 0 || disabled}
        >
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
