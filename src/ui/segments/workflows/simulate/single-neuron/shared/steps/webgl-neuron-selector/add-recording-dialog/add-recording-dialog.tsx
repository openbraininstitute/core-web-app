import React from 'react';

import { classNames } from '@/util/utils';

import { HintContent } from '../hint';
import { useRecordingsAndInjection } from '../hooks';
import { useEscapeHandler } from './hooks';

import type { PainterManager } from '../painter';

import styles from './add-recording-dialog.module.css';

export interface AddRecordingDialogProps {
  className?: string;
  sessionId: string;
  painterManager: PainterManager;
}

export default function AddRecordingDialog({
  className,
  sessionId,
  painterManager,
}: AddRecordingDialogProps) {
  const data = useRecordingsAndInjection(sessionId);
  const [open, setOpen] = React.useState(false);
  const { offset, item, y } = painterManager.eventTap.useValue({
    x: 0,
    y: 0,
    item: null,
    offset: 0,
  });

  React.useEffect(() => {
    if (item) setOpen(true);
  }, [item]);

  const handleClose = React.useCallback(() => {
    setOpen(false);
  }, []);
  const handleMoveInjection = () => {
    handleClose();
    if (item) data.moveInjection(item.sectionName);
  };
  const handleAddRecording = () => {
    handleClose();
    if (item) data.addRecording(item.sectionName, offset);
  };
  useEscapeHandler(handleClose);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: already have a button inside
    <div
      className={classNames(className, styles.addRecordingDialog, open && styles.open)}
      title={`y = ${y}`}
      onClick={handleClose}
      role="alertdialog"
    >
      {/** biome-ignore lint/a11y/useKeyWithClickEvents: already have a button inside */}
      <div
        className={y < 0 ? styles.top : styles.bottom}
        onClick={(evt) => {
          evt.preventDefault();
          evt.stopPropagation();
        }}
        role="dialog"
      >
        <header>
          <h2>
            {item?.sectionName} ({offset.toFixed(2)})
          </h2>
          <button type="button" onClick={handleClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="1.5em"
              height="1.5em"
            >
              <title>window-close</title>
              <path
                fill="currentColor"
                d="M13.46,12L19,17.54V19H17.54L12,13.46L6.46,19H5V17.54L10.54,12L5,6.46V5H6.46L12,10.54L17.54,5H19V6.46L13.46,12Z"
              />
            </svg>
            <div>Cancel</div>
          </button>
        </header>
        <HintContent painterManager={painterManager} />
        <div className={styles.buttons}>
          <button type="button" onClick={handleMoveInjection}>
            Move injection here
          </button>
          <button type="button" onClick={handleAddRecording}>
            Add recording
          </button>
        </div>
      </div>
    </div>
  );
}
