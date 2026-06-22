'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import styles from './approval-dialog.module.css';

interface ApprovalDialogProps {
  open: boolean;
  toolName: string;
  args: unknown;
  onApprove: () => void;
  onReject: (reason: string | undefined) => void;
  onClose: () => void;
}

export default function ApprovalDialog({
  open,
  toolName,
  args,
  onApprove,
  onReject,
  onClose,
}: ApprovalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showRejectUI, setShowRejectUI] = useState(false);
  const [reason, setReason] = useState('');

  // Open/close the dialog based on the `open` prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  // Reset rejection UI state when dialog re-opens
  useEffect(() => {
    if (open) {
      setShowRejectUI(false);
      setReason('');
    }
  }, [open]);

  // Handle Escape / cancel event — close without action
  const handleCancel = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      onClose();
    },
    [onClose]
  );

  const handleAccept = useCallback(() => {
    onApprove();
  }, [onApprove]);

  const handleRejectClick = useCallback(() => {
    setShowRejectUI(true);
  }, []);

  const handleConfirmReject = useCallback(() => {
    const trimmed = reason.trim();
    onReject(trimmed || undefined);
  }, [reason, onReject]);

  const handleReasonChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= 500) {
      setReason(value);
    }
  }, []);

  const formattedArgs = (() => {
    try {
      if (typeof args === 'string') {
        return JSON.stringify(JSON.parse(args), null, 2);
      }
      return JSON.stringify(args, null, 2);
    } catch {
      return String(args);
    }
  })();

  return (
    <dialog ref={dialogRef} className={styles.dialog} onCancel={handleCancel}>
      <h2 className={styles.heading}>{toolName}</h2>
      <pre className={styles.arguments}>{formattedArgs}</pre>

      {!showRejectUI ? (
        <div className={styles.actions}>
          <button type="button" className={styles.rejectButton} onClick={handleRejectClick}>
            Reject
          </button>
          <button type="button" className={styles.acceptButton} onClick={handleAccept}>
            Accept
          </button>
        </div>
      ) : (
        <div className={styles.rejectSection}>
          <textarea
            className={styles.reasonTextarea}
            placeholder="Reason for rejection (optional)"
            value={reason}
            onChange={handleReasonChange}
            maxLength={500}
          />
          <button type="button" className={styles.confirmButton} onClick={handleConfirmReject}>
            Confirm
          </button>
        </div>
      )}
    </dialog>
  );
}
