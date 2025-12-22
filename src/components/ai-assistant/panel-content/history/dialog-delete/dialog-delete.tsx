import React from 'react';
import { Button } from 'antd';

import { classNames } from '@/util/utils';
import { useAiAssistant } from '@/services/ai-agent/assistant';

import styles from './dialog-delete.module.css';

export interface DialogDeleteProps {
  className?: string;
  open: boolean;
  threadId: string | undefined;
  threadTitle: string;
  onClose(): void;
}

export default function DialogDelete({
  className,
  open,
  threadId,
  threadTitle,
  onClose,
}: DialogDeleteProps) {
  const assistant = useAiAssistant();
  const ref = React.useRef<HTMLDialogElement | null>(null);
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  return (
    <dialog className={classNames(styles.dialogDelete)} ref={ref}>
      <div className={className}>
        <header>Delete a conversation</header>
        <p>
          You are about to delete the conversation <strong>&ldquo;{threadTitle}&rdquo;</strong>...
        </p>
        <em>This can not be undone!</em>
        <footer>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            danger
            onClick={() => {
              if (threadId) assistant.deleteThread(threadId);
              onClose();
            }}
          >
            Confirm
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
