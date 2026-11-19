// Typed DELETE confirmation for things nothing can undo (logs, sections).
// Escape and the backdrop do nothing while the delete runs, so a half-done delete is never hidden.
import { isNil } from 'es-toolkit';
import { useEffect, useId, useRef, useState } from 'react';

import { Icon } from '@/features/logbook/ui/icons';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';
import type { TIconName } from '@/features/logbook/ui/icons';

const WORD = 'delete';

export interface IGoesWith {
  readonly icon: TIconName;
  readonly text: string;
}

// Letters typed right from the start; -1 once one is wrong.
export function typedOf(value: string): number {
  const typed = value.trim().toLowerCase();
  return WORD.startsWith(typed) ? typed.length : -1;
}

export interface IConfirmDeleteDialogProps {
  readonly title: string;
  readonly lead: string;
  readonly ticket: ReactNode;
  readonly goes: readonly IGoesWith[];
  readonly button: string;
  readonly failedText: string; // shown when the error has no message
  // Rejects with the reason (a 503 is safe to retry).
  readonly onDelete: () => Promise<unknown>;
  readonly onClose: () => void;
}

export function ConfirmDeleteDialog(props: IConfirmDeleteDialogProps) {
  const { onDelete, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const ids = useId();
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  // A class, not a key: a new key would rebuild the field and drop focus.
  const [shaking, setShaking] = useState(false);
  const typed = typedOf(value);
  const ready = typed === WORD.length;

  // showModal() focuses the first button; move focus to the field after.
  useEffect(() => {
    dialog.current?.showModal();
    field.current?.focus();
  }, []);

  const close = (): void => {
    if (!busy) onClose();
  };
  const type = (next: string): void => {
    if (typedOf(next) === -1 && typedOf(value) !== -1) setShaking(true);
    setValue(next);
  };
  const remove = (): void => {
    if (!ready || busy) return;
    setBusy(true);
    setFailed(null);
    onDelete()
      .then(onClose)
      .catch((error: unknown) => {
        setBusy(false);
        setFailed(error instanceof Error ? error.message : props.failedText);
      });
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: a click on the backdrop closes; Escape is the dialog's own key
    <dialog
      ref={dialog}
      className="m-auto max-h-[calc(100dvh-24px)] w-[min(520px,calc(100vw-24px))] overflow-hidden rounded-[24px] border-0 bg-white p-0 text-primary-9 shadow-pop backdrop:bg-[rgba(4,21,48,0.45)] backdrop:backdrop-blur-[3px] open:animate-up"
      aria-labelledby={`${ids}-title`}
      aria-describedby={`${ids}-text`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      {/* Clips to round corners; the form scrolls inside on short windows. */}
      <form
        className="scroll-thin max-h-[calc(100dvh-24px)] overflow-y-auto"
        onSubmit={(event) => {
          event.preventDefault();
          remove();
        }}
      >
        <div className="relative px-6 pt-6 pb-5">
          <button
            type="button"
            className="modal-close absolute top-4 right-4"
            aria-label="Close"
            disabled={busy}
            onClick={close}
          >
            <Icon name="close" size={14} stroke={2.4} />
          </button>
          <div className="flex items-start pr-10">
            <div className="flex min-w-0 flex-col gap-1">
              <h2 id={`${ids}-title`} className="text-[19px] leading-tight font-bold">
                {props.title}
              </h2>
              <p id={`${ids}-text`} className="text-[13.5px] leading-snug text-neutral-4">
                {props.lead}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 px-6 pt-1 pb-6">
          {props.ticket}

          <div className="flex flex-col gap-2">
            <span className="label-caps">Goes with it</span>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {props.goes.map(({ icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-[13px] text-neutral-10">
                  <span className="grid size-7 flex-none place-items-center rounded-full bg-white text-red shadow-block-btn">
                    <Icon name={icon} size={13} stroke={2.2} />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor={`${ids}-word`} className="text-[13px] font-bold text-neutral-10">
              Type DELETE to confirm
            </label>
            <div
              className={cn(shaking && 'motion-safe:animate-shake')}
              onAnimationEnd={() => setShaking(false)}
            >
              <div
                className={cn(
                  'flex h-11 items-center gap-2 rounded-[14px] border bg-white pr-2 pl-3.5 transition-[border-color,box-shadow] duration-150',
                  typed === -1
                    ? 'border-red/60 ring-3 ring-red/10'
                    : ready
                      ? 'border-red ring-3 ring-red/15'
                      : 'border-block-border focus-within:border-primary-4 focus-within:ring-3 focus-within:ring-primary-1'
                )}
              >
                <input
                  ref={field}
                  id={`${ids}-word`}
                  className="min-w-0 flex-1 border-0 bg-transparent text-[15px] text-primary-9 outline-none placeholder:text-neutral-4/70"
                  value={value}
                  placeholder="DELETE"
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  disabled={busy}
                  aria-invalid={typed === -1}
                  onChange={(event) => type(event.target.value)}
                />
                <span
                  className={cn(
                    'grid size-7 flex-none place-items-center rounded-full transition-[background-color,color,transform] duration-200',
                    ready
                      ? 'scale-100 bg-red text-white'
                      : 'scale-90 bg-transparent text-transparent'
                  )}
                  aria-hidden="true"
                >
                  <Icon name="check" size={14} stroke={2.8} />
                </span>
              </div>
            </div>
          </div>

          {isNil(failed) ? null : (
            <p
              className="flex items-start gap-2 rounded-xl bg-red/8 px-3 py-2.5 text-[13px] font-semibold text-red"
              role="alert"
            >
              <Icon name="info" size={15} stroke={2.2} />
              <span>{failed} Try again: a second try finishes what the first began.</span>
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="h-11 rounded-full bg-fill-2 px-5 text-[14px] font-bold disabled:opacity-50"
              disabled={busy}
              onClick={close}
            >
              Keep it
            </button>
            <button
              type="submit"
              className="inline-flex h-11 items-center gap-2 rounded-full bg-red px-5 text-[14px] font-bold text-white shadow-red-btn transition-[opacity,transform,box-shadow] duration-150 enabled:hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-35 disabled:shadow-none"
              disabled={!ready || busy}
            >
              {busy ? (
                <span
                  className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                  aria-hidden="true"
                />
              ) : (
                <Icon name="trash" size={15} stroke={2.2} />
              )}
              {busy ? 'Deleting…' : props.button}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
