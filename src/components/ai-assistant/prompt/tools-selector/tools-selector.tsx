/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';

import { IconGear } from '../../icons/gear';
import { Spinner } from '../../spinner';
import { useAIToolsSelection } from '../../state';
import ToolCard from './tool-card';
import { IconClose } from './icon-close';
import { IconUnchecked } from './tool-card/icon-unchecked';
import { IconChecked } from './tool-card/icon-checked';
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
  const [selection, setSelection] = useAIToolsSelection();
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
  const selectionCount = selection ? selection.length : 0;
  const toolsCount = tools?.length ?? -1;
  const allToolsSelected = selectionCount === toolsCount;

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
            <div>
              <strong>Tools</strong> {selectionCount}/{tools?.length > 0 ? tools.length : ''}
            </div>
            <button type="button" onClick={handleClose} aria-label="Close">
              <IconClose />
            </button>
          </div>
          <div>
            {allToolsSelected ? (
              <button
                type="button"
                className={styles.selectButton}
                onClick={() => setSelection([])}
              >
                <div>Unselect all tools</div> <IconChecked />
              </button>
            ) : (
              tools && (
                <button
                  type="button"
                  className={styles.selectButton}
                  onClick={() => setSelection(tools.map((tool) => tool.id))}
                >
                  <div>Select all tools</div> <IconUnchecked />
                </button>
              )
            )}
          </div>
        </header>
        <hr />
        {tools && tools.length > 0 ? (
          <>
            <main>
              {tools.map((tool) => (
                <ToolCard key={tool.id} tool={tool} />
              ))}
            </main>
          </>
        ) : (
          <div className={styles.loading}>
            <div>Loading...</div>
            <Spinner />
          </div>
        )}
      </div>
      <footer>
        <IconGear />
      </footer>
    </dialog>
  );
}
