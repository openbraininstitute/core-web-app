/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import React from 'react';
import { IconClose } from '@/components/LandingPage/icons/IconClose';
import { classNames } from '@/util/utils';
import { HintContent } from '../hint';
import { useRecordingsAndInjection } from '../hooks';
import type { PainterManager } from '../painter';
import styles from './add-recording-dialog.module.css';
import { useEscapeHandler } from './hooks';

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
    <div
      className={classNames(className, styles.addRecordingDialog, open && styles.open)}
      title={`y = ${y}`}
      onClick={handleClose}
      role="alertdialog"
    >
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
            <IconClose />
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
