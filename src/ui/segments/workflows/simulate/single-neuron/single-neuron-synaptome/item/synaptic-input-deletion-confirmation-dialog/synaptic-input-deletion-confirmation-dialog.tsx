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
  const handleClose = () => onOpenChange(false);

  if (!open) return null;

  return (
    <dialog
      className={cn(className, styles.synapticInputDeletionConfirmationDialog)}
      open={open}
      onClose={handleClose}
      closedby="any"
      onClick={handleClose}
      onKeyDown={handleClose}
    >
      <div>
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
      </div>
    </dialog>
  );
}
