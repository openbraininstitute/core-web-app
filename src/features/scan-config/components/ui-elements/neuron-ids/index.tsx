import {
  CheckOutlined,
  CloseOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useId, useMemo, useRef, useState } from 'react';

import NumberEditor from '@/features/scan-config/components/ui-elements/neuron-ids/number-editor';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { FancyActions, FancyField, type FancyInputAction } from '@/ui/molecules/fancy-input';

import type { ConfigValue } from '@/features/scan-config/types';
import type { FancyChrome } from '@/ui/molecules/fancy-input';

const MAX_INPUT_LENGTH = 1000;
/** Above this many IDs the tray shows the first ones and a "+N more" chip into the editor. */
const SHOWN_IDS = 40;
const SEPARATOR = /[\s,]+/;
const INTEGER = /^\d+$/;

/**
 * Neuron IDs as a tray of chips with the typing spot at the end, like a recipients field.
 * A comma, space or Enter turns what was typed into chips (a pasted list works the same way),
 * Backspace on an empty input takes the last chip back, and the full editor handles bulk edits.
 */
export default function NeuronIds({
  value,
  disabled,
  onAddIds,
  chrome,
}: {
  value: ConfigValue;
  disabled: boolean;
  onAddIds: (newElements: number[] | null) => void;
  chrome?: FancyChrome;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState('');
  const [copied, setCopied] = useState(false);

  const allElements = useMemo(() => {
    const namedTupleArray = Array.isArray(value) ? value : [value];
    const elements: number[] = namedTupleArray.flatMap((v) =>
      isPlainObject(v) && Array.isArray(v.elements) ? (v.elements as number[]) : []
    );
    // Remove duplicates and sort
    return [...new Set(elements)].sort((a, b) => a - b);
  }, [value]);

  /** The full editor's text, seeded from the held IDs each time it opens. */
  const [text, setText] = useState('');
  const [isTextValid, setIsTextValid] = useState(true);
  const openEditor = () => {
    setText(allElements.join(', '));
    setEdit(true);
  };

  const write = (ids: number[] | null) => onAddIds(ids && ids.length > 0 ? ids : null);
  const add = (tokens: string[]) =>
    write([...new Set([...allElements, ...tokens.map(Number)])].sort((a, b) => a - b));

  const draftError = draft.split(SEPARATOR).some((t) => t !== '' && !INTEGER.test(t))
    ? 'Only whole numbers, separated by commas, spaces or Enter'
    : undefined;

  /** Commits every finished token; whatever follows the last separator keeps being typed. */
  const handleDraft = (raw: string) => {
    const parts = raw.split(SEPARATOR);
    const rest = parts.pop() ?? '';
    const done = parts.filter(Boolean);
    if (done.length > 0 && done.every((t) => INTEGER.test(t))) {
      add(done);
      setDraft(rest);
      return;
    }
    setDraft(raw);
  };

  const commitDraft = () => {
    const tokens = draft.split(SEPARATOR).filter(Boolean);
    if (tokens.length === 0 || !tokens.every((t) => INTEGER.test(t))) return;
    add(tokens);
    setDraft('');
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(allElements.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Error logging required
      console.error('Clipboard write failed:', err);
    }
  };

  const borderActions: Array<FancyInputAction> = [
    ...(disabled
      ? []
      : [
          ...(allElements.length > 0
            ? [
                {
                  key: 'clear',
                  label: 'Clear all IDs',
                  icon: <DeleteOutlined />,
                  onClick: () => write(null),
                },
              ]
            : []),
          { key: 'edit', label: 'Edit all IDs', icon: <EditOutlined />, onClick: openEditor },
        ]),
    {
      key: 'copy',
      label: copied ? 'Copied' : 'Copy IDs',
      icon: copied ? <CheckOutlined /> : <CopyOutlined />,
      disabled: allElements.length === 0,
      onClick: copy,
    },
  ];

  if (edit) {
    return (
      <FancyField {...chrome} active>
        <div className="flex flex-col gap-2 px-2 pt-4 pb-2">
          <NumberEditor
            value={text}
            setIsTextValid={setIsTextValid}
            setValue={setText}
            disabled={disabled}
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="cursor-pointer rounded-full px-3 py-1 text-sm text-primary-8 hover:bg-neutral-1"
              onClick={() => setEdit(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!isTextValid || disabled}
              className="cursor-pointer rounded-full bg-primary-8 px-4 py-1 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => {
                write(parseCsvIntegers(text));
                setEdit(false);
              }}
            >
              Apply
            </button>
          </div>
        </div>
      </FancyField>
    );
  }

  const shown = allElements.slice(0, SHOWN_IDS);
  const hidden = allElements.length - shown.length;
  const count = `${allElements.length} ID${allElements.length === 1 ? '' : 's'}`;

  return (
    <FancyField
      {...chrome}
      htmlFor={inputId}
      disabled={disabled}
      error={draftError ?? chrome?.error}
      helperText={allElements.length > 0 ? count : 'Separate IDs with commas, spaces or Enter'}
      borderActions={<FancyActions onBorder actions={borderActions} />}
    >
      {/* The tray: clicking its empty space puts the caret at the end, like one long input. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: forwards a click to the input */}
      <div
        className="flex min-h-11 flex-wrap items-center gap-1.5 px-2.5 pt-3 pb-2"
        onMouseDown={(e) => {
          if (e.target !== e.currentTarget) return;
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        {shown.map((id) => (
          <span
            key={id}
            className="inline-flex items-center gap-0.5 rounded-full bg-primary-0 py-0.5 ps-2 pe-0.5 font-mono text-xs font-semibold text-primary-8 tabular-nums transition-[opacity,scale] duration-150 ease-out starting:scale-90 starting:opacity-0 motion-reduce:transition-none"
          >
            {id}
            {!disabled && (
              <button
                type="button"
                aria-label={`Remove ID ${id}`}
                className="grid size-4 cursor-pointer place-items-center rounded-full text-[9px] text-primary-8/60 transition-colors hover:bg-primary-8 hover:text-white"
                onClick={() => write(allElements.filter((one) => one !== id))}
              >
                <CloseOutlined />
              </button>
            )}
          </span>
        ))}
        {hidden > 0 && (
          <button
            type="button"
            className="cursor-pointer rounded-full bg-primary-8 px-2 py-0.5 text-xs font-semibold text-white"
            onClick={openEditor}
          >
            +{hidden} more
          </button>
        )}
        {!disabled && (
          <input
            ref={inputRef}
            id={inputId}
            value={draft}
            maxLength={MAX_INPUT_LENGTH}
            spellCheck={false}
            autoComplete="off"
            inputMode="numeric"
            aria-invalid={!!draftError}
            placeholder={allElements.length > 0 ? 'Add more…' : 'Type IDs, e.g. 12, 40, 7'}
            className="min-w-24 flex-1 bg-transparent py-1 font-mono text-sm text-primary-9 outline-none placeholder:font-sans placeholder:text-neutral-3"
            onChange={(e) => handleDraft(e.target.value)}
            onBlur={commitDraft}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitDraft();
              } else if (e.key === 'Backspace' && draft === '' && allElements.length > 0) {
                e.preventDefault();
                write(allElements.slice(0, -1));
              }
            }}
          />
        )}
        {disabled && allElements.length === 0 && (
          <span className="py-1 text-sm text-neutral-4 italic">No IDs</span>
        )}
      </div>
    </FancyField>
  );
}

function parseCsvIntegers(data: string): number[] {
  if (!data) return [];

  const result = new Set<number>();
  const len = data.length;
  let current = 0;
  let hasDigit = false;

  for (let i = 0; i < len; i++) {
    const charCode = data.charCodeAt(i);

    // Character codes for '0'-'9' are 48-57
    if (charCode >= 48 && charCode <= 57) {
      current = current * 10 + (charCode - 48);
      hasDigit = true;
      continue;
    }

    // Delimiters: comma (44), newline (10), carriage return (13), space (32)
    if (charCode === 44 || charCode === 10 || charCode === 13 || charCode === 32) {
      if (hasDigit) {
        result.add(current);
        current = 0;
        hasDigit = false;
      }
      continue;
    }

    throw new Error('Invalid integer');
  }

  if (hasDigit) {
    result.add(current);
  }

  return Array.from(result).sort((a, b) => a - b);
}
