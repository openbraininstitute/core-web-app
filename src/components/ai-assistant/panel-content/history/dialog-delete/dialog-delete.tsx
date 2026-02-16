import { Button } from 'antd';
import React from 'react';

import { useAiAssistant } from '@/services/ai-agent/assistant';
import { classNames } from '@/util/utils';

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

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    if (open) {
      dialog.showModal();
      dialog.addEventListener('cancel', handleCancel);
    } else {
      dialog.close();
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
    };
  }, [open, onClose]);

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
