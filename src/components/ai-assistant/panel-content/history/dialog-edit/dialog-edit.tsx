import React from 'react';
import { Button } from 'antd';

import { classNames } from '@/util/utils';

import styles from './dialog-edit.module.css';

export interface DialogEditProps {
  className?: string;
  open: boolean;
  threadId: string | undefined;
  threadTitle: string;
  onValidate(threadId: string | undefined, threadTitle: string): void;
  onCancel(): void;
}

export default function DialogEdit({
  className,
  open,
  threadId,
  threadTitle,
  onValidate,
  onCancel,
}: DialogEditProps) {
  const ref = React.useRef<HTMLDialogElement | null>(null);
  const [title, setTitle] = React.useState('New conversation...');
  React.useEffect(() => setTitle(threadTitle), [threadTitle]);
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      onValidate(threadId, title);
    }
  };

  return (
    <dialog className={classNames(styles.dialogEdit)} ref={ref}>
      <div className={className}>
        <header>Edit conversation title</header>
        <input
          type="text"
          value={title}
          onInput={(evt) => setTitle((evt.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
        />
        <footer>
          <Button onClick={onCancel}>Cancel</Button>
          <Button
            disabled={title.trim().length === 0}
            onClick={() => {
              onValidate(threadId, title);
            }}
          >
            Validate
          </Button>
        </footer>
      </div>
    </dialog>
  );
}
