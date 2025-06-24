/* eslint-disable jsx-a11y/tabindex-no-positive */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import Link from 'next/link';

import { IconChecked } from './icon-checked';
import { IconUnchecked } from './icon-unchecked';
import { classNames } from '@/util/utils';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';
import { useAIToolsSelection } from '@/components/ai-assistant/state';

import styles from './tool-card.module.css';

export interface ToolCardProps {
  className?: string;
  tool: AIAssistantTool;
}

export default function ToolCard({ className, tool }: ToolCardProps) {
  const [selection, setSelection] = useAIToolsSelection();
  const checked = Boolean(selection && selection.includes(tool.id));
  const Icon = tool.icon;
  const handleToggle = () => {
    if (checked) setSelection((selection ?? []).filter((id) => id !== tool.id));
    else setSelection([...(selection ?? []), tool.id]);
  };

  return (
    <div className={classNames(className, styles.toolCard)}>
      <header aria-checked={checked} onClick={handleToggle} tabIndex={1}>
        <Icon />
        <div>{tool.name}</div>
        {checked ? <IconChecked /> : <IconUnchecked />}
      </header>
      <p>{tool.description}</p>
      <Link href={tool.docURL} target="documentation" className={styles.readmore}>
        Read more
      </Link>
    </div>
  );
}
