import { CloseOutlined, DeleteOutlined } from '@ant-design/icons';

/** A small round button at the top right of what the form column shows. */
const FORM_HEADER_BUTTON_CLASS =
  'shrink-0 cursor-pointer rounded-full px-2 py-1 text-neutral-3 transition-colors hover:bg-neutral-3/20 hover:text-primary-8';

/** The × at the top right of a block's form, or of a list of blocks to pick from: folds the column away. */
export function CloseFormButton({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      aria-label="Close"
      data-testid="scan-config-close-form"
      className={FORM_HEADER_BUTTON_CLASS}
      onClick={onClose}
    >
      <CloseOutlined />
    </button>
  );
}

/** The dustbin at the top right of a block picked for a union: takes the pick back. */
export function ResetBlockSelectionButton({ onReset }: { onReset: () => void }) {
  return (
    <button
      type="button"
      aria-label="Reset block selection"
      data-testid="scan-config-reset-block-selection"
      className={FORM_HEADER_BUTTON_CLASS}
      onClick={onReset}
    >
      <DeleteOutlined />
    </button>
  );
}
