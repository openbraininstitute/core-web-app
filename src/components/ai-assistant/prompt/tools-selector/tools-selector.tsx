/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import type { AIAssistantTool } from '@/services/ai-agent/tools/ai-assistant-tool';
import { classNames } from '@/util/utils';
import { IconGear } from '../../icons/gear';
import { useAIToolsInvertedSelection } from '../../state';
import { WaveLoader } from '../../wave-loader';
import { IconClose } from './icon-close';
import ToolCard from './tool-card';
import { IconChecked } from './tool-card/icon-checked';
import { IconUnchecked } from './tool-card/icon-unchecked';

import styles from './tools-selector.module.css';

interface ToolsSelectorProps {
  className?: string;
  open: boolean;
  tools: AIAssistantTool[];
  onClose(): void;
}

const SELECTABLE_TOOLS_IDS = ['web-search-tool', 'literature-search-tool'];

export default function ToolsSelector({ className, tools, open, onClose }: ToolsSelectorProps) {
  const ref = React.useRef<HTMLDialogElement | null>(null);
  const [invertedSelection, setInvertedSelection] = useAIToolsInvertedSelection();
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
  const invertedSelectionCount = invertedSelection ? invertedSelection.length : 0;
  const toolsCount = tools?.length ?? -1;
  const unselectableToolsCount = toolsCount - SELECTABLE_TOOLS_IDS.length;
  const selectionCount = toolsCount - invertedSelectionCount - unselectableToolsCount;
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
              <strong>Tools</strong> {selectionCount}/{toolsCount - unselectableToolsCount}
            </div>
            <button type="button" onClick={handleClose} aria-label="Close">
              <IconClose />
            </button>
          </div>
          {/* This selector has been hidden for now, but it will come back. */}
          <div style={{ display: 'none' }}>
            {allToolsSelected ? (
              <button
                type="button"
                className={styles.selectButton}
                onClick={() => setInvertedSelection(tools.map((tool) => tool.id))}
              >
                <div>Unselect all tools</div> <IconChecked />
              </button>
            ) : (
              tools && (
                <button
                  type="button"
                  className={styles.selectButton}
                  onClick={() => setInvertedSelection([])}
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
              {tools
                .filter(({ id }) => SELECTABLE_TOOLS_IDS.includes(id))
                .map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
            </main>
          </>
        ) : (
          <div className={styles.loading}>
            <div>Loading...</div>
            <WaveLoader />
          </div>
        )}
      </div>
      <footer>
        <IconGear />
      </footer>
    </dialog>
  );
}
