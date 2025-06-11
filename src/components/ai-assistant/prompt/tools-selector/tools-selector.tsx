/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';

import { IconGear } from '../../icons/gear';
import ToolCard from './tool-card';
import { IconClose } from './icon-close';
import { classNames } from '@/util/utils';
import { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';

import styles from './tools-selector.module.css';

export interface ToolsSelectorProps {
  className?: string;
  open: boolean;
  tools: AIAssistantTool[];
  onClose(): void;
}

export default function ToolsSelector({ className, tools, open, onClose }: ToolsSelectorProps) {
  const ref = React.useRef<HTMLDialogElement | null>(null);
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);
  const handleClose = () => {
    const dialog = ref.current;
    if (!dialog) return;

    dialog.close();
    onClose();
  };

  return (
    <dialog
      className={classNames(className, styles.toolsSelector)}
      ref={ref}
      onClose={onClose}
      onClick={handleClose}
    >
      <div onClick={(evt) => evt.stopPropagation()} role="alertdialog">
        <header>
          <div>
            <strong>Tools</strong> {tools.length}
          </div>
          <button type="button" onClick={handleClose} aria-label="Close">
            <IconClose />
          </button>
        </header>
        <main>
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} />
          ))}
        </main>
      </div>
      <footer>
        <IconGear />
      </footer>
    </dialog>
  );
}
