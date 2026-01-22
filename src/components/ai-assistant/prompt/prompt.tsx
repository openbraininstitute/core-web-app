'use client';

import React from 'react';
import SendIcon from '@/components/icons/Send';
import { setUserHasPrompted, USER_HAS_PROMPTED } from '@/services/ai-agent';
import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';
import { classNames } from '@/util/utils';

import styles from './prompt.module.css';
// import { IconGear } from '../icons/gear';
import ToolsSelector from './tools-selector';

interface PromptProps {
  className?: string;
  value: string;
  tools: AIAssistantTool[];
  onChange(value: string): void;
  onClick(value: string): void;
}

export default function Prompt({ className, value, tools, onChange, onClick }: PromptProps) {
  const [showToolsSelector, setShowToolsSelector] = React.useState(false);

  const handleSendClick = () => {
    setUserHasPrompted(true);
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
            // eslint-disable-next-line jsx-a11y/no-autofocus
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
          disabled={value.trim().length === 0}
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
