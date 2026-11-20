// Native <dialog> + showModal() gives backdrop, focus trap, Escape and top layer for free.
import { isNil } from 'es-toolkit';
import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/ui/molecules/icon';

import type { ILogDetailsDialogProps } from '@/features/logbook/types';

const FIELD =
  'w-full rounded-[12px] border border-block-border bg-white px-3 py-2.5 text-[15px] text-primary-9 outline-none focus:border-primary-4 focus:ring-2 focus:ring-primary-1';
const LABEL = 'flex flex-col gap-1.5 text-[13px] font-bold text-neutral-4';

export function LogDetailsDialog(props: ILogDetailsDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(props.name);
  const [description, setDescription] = useState(props.description);
  const [failed, setFailed] = useState<string | null>(null);

  // Reset to the saved values on each open.
  useEffect(() => {
    const el = dialog.current;
    if (isNil(el)) return;
    if (props.open && !el.open) {
      setName(props.name);
      setDescription(props.description);
      setFailed(null);
      el.showModal();
    }
    if (!props.open && el.open) el.close();
  }, [props.open, props.name, props.description]);

  const save = (): void => {
    const draft = { name: name.trim() || props.name, description: description.trim() };
    setFailed(null);
    props
      .onSave(draft)
      .then(props.onClose)
      .catch((error: unknown) =>
        setFailed(error instanceof Error ? error.message : 'It was not saved.')
      );
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click closes; Escape is the dialog's own
    <dialog
      ref={dialog}
      className="scroll-thin m-auto max-h-[calc(100dvh-24px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-[20px] border-0 bg-white p-0 text-primary-9 shadow-pop backdrop:bg-[rgba(4,21,48,0.35)]"
      aria-labelledby="log-details-title"
      onClose={props.onClose}
      onClick={(event) => event.target === event.currentTarget && props.onClose()}
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id="log-details-title" className="text-[18px] font-bold">
            Name and description
          </h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={props.onClose}>
            <Icon name="close" size={14} stroke={2.4} />
          </button>
        </div>
        <label className={LABEL}>
          Name
          <input
            className={FIELD}
            value={name}
            maxLength={300}
            required
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className={LABEL}>
          Description
          <textarea
            className={`${FIELD} resize-y`}
            value={description}
            rows={4}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
        {isNil(failed) ? null : (
          <p className="text-[13px] font-semibold text-destructive" role="alert">
            {failed}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="h-10 rounded-full bg-fill-2 px-4 text-[14px] font-bold"
            onClick={props.onClose}
          >
            Cancel
          </button>
          <button type="submit" className="btn-navy h-10" disabled={props.saving}>
            {props.saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
