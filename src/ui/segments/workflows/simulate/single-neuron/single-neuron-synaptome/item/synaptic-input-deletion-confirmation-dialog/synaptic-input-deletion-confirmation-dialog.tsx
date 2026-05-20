import React from 'react';

import { Button } from '@/ui/molecules/button';
import { cn } from '@/utils/css-class';

import styles from './synaptic-input-deletion-confirmation-dialog.module.css';

export interface SynapticInputDeletionConfirmationDialogProps {
  className?: string;
  open: boolean;
  onOpenChange(open: boolean): void;
  /**
   * the user has clicked "confirm".
   */
  onConfirm(): void;
}

export function SynapticInputDeletionConfirmationDialog({
  className,
  open,
  onOpenChange,
  onConfirm,
}: SynapticInputDeletionConfirmationDialogProps) {
  const refDialog = React.useRef<HTMLDialogElement | null>(null);
  const handleClose = () => {
    const dialog = refDialog.current;
    if (!dialog) return;

    dialog.close();
    onOpenChange(false);
  };
  React.useEffect(() => {
    const dialog = refDialog.current;
    if (!dialog) return;

    if (open) dialog.showModal();
    else dialog.close();
  }, [open]);

  return (
    <dialog
      ref={refDialog}
      className={cn(className, styles.synapticInputDeletionConfirmationDialog)}
      closedby="any"
      onClose={handleClose}
    >
      <p className="text-primary-9 text-justify text-sm">
        Are you sure you want to delete this synaptic input configuration?
      </p>
      <footer>
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button variant="success" onClick={onConfirm}>
          Confirm
        </Button>
      </footer>
    </dialog>
  );
}
