import { useEffect, useId, useRef, useState } from 'react';

import {
  canLink,
  hrefOf,
  linkTargetOf,
  removeLink,
  saveLink,
} from '@/features/logbook/editor/formats';
import { Icon } from '@/ui/molecules/icon';

import type { Editor } from '@tiptap/react';

const FIELD =
  'w-full rounded-[12px] border border-block-border bg-white px-3 py-2.5 text-[15px] text-primary-9 outline-none focus:border-primary-4 focus:ring-2 focus:ring-primary-1 disabled:bg-fill-2 disabled:text-neutral-4';
const LABEL = 'flex flex-col gap-1.5 text-[13px] font-bold text-neutral-4';

/** Adds, edits or removes the link at the selection or cursor. */
export function LinkDialog({
  editor,
  onClose,
}: {
  readonly editor: Editor;
  readonly onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const textRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const [target] = useState(() => linkTargetOf(editor));
  const [text, setText] = useState(target.text);
  const [url, setUrl] = useState(target.href);
  const href = hrefOf(url);
  const valid = canLink(editor, href);

  useEffect(() => {
    dialog.current?.showModal();
    (target.text.length > 0 ? urlRef : textRef).current?.focus();
  }, [target.text]);

  const close = (): void => {
    onClose();
    editor.commands.focus();
  };
  const finish = (apply: () => void): void => {
    apply();
    onClose();
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: backdrop click closes; Escape is the dialog's own
    <dialog
      ref={dialog}
      className="scroll-thin m-auto max-h-[calc(100dvh-24px)] w-[min(480px,calc(100vw-32px))] overflow-y-auto rounded-[20px] border-0 bg-white p-0 text-primary-9 shadow-pop backdrop:bg-primary-10/35"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <form
        className="flex flex-col gap-4 p-6"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid)
            finish(() =>
              saveLink(editor, linkTargetOf(editor), { text, href, renamed: text !== target.text })
            );
        }}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-[18px] font-bold">
            {target.href.length > 0 ? 'Edit link' : 'Add link'}
          </h2>
          <button type="button" className="modal-close" aria-label="Close" onClick={close}>
            <Icon name="close" size={14} stroke={2.4} />
          </button>
        </div>
        <label className={LABEL}>
          Text
          <input
            ref={textRef}
            className={FIELD}
            value={text}
            placeholder="Text to show"
            disabled={!target.textEditable}
            title={target.textEditable ? undefined : 'The selection holds more than plain text.'}
            onChange={(event) => setText(event.target.value)}
          />
        </label>
        <label className={LABEL}>
          Link
          <input
            ref={urlRef}
            className={FIELD}
            value={url}
            inputMode="url"
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        {href.length > 0 && !valid ? (
          <p className="text-[13px] font-semibold text-destructive" role="alert">
            This address cannot be linked.
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {target.href.length > 0 ? (
            <button
              type="button"
              className="mr-auto h-10 rounded-full px-4 text-[14px] font-bold text-destructive hover:bg-fill-2"
              onClick={() => finish(() => removeLink(editor, linkTargetOf(editor)))}
            >
              Remove link
            </button>
          ) : null}
          <button
            type="button"
            className="h-10 rounded-full bg-fill-2 px-4 text-[14px] font-bold"
            onClick={close}
          >
            Cancel
          </button>
          <button type="submit" className="logbook-btn-navy h-10" disabled={!valid}>
            Save
          </button>
        </div>
      </form>
    </dialog>
  );
}
