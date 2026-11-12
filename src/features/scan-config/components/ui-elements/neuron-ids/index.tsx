import {
  RiAddLine,
  RiCheckLine,
  RiCloseLine,
  RiCornerDownLeftLine,
  RiDeleteBinLine,
  RiFileCopyLine,
  RiPencilLine,
} from '@remixicon/react';
import { Button } from 'antd';
import { Fragment, type ReactNode, useMemo, useRef, useState } from 'react';

import NumberEditor from '@/features/scan-config/components/ui-elements/neuron-ids/number-editor';
import {
  ScanHint,
  SweepIconButton,
} from '@/features/scan-config/components/ui-elements/parameter-sweep';
import { isPlainObject } from '@/features/scan-config/components/utils';
import { cn } from '@/utils/css-class';

import type React from 'react';
import type { ConfigValue } from '@/features/scan-config/types';

/** IDs shown at each end of a long list; the middle collapses into a "more" chip. */
const VISIBLE_AT_EACH_END = 12;

/** What obi-one calls a set that was given no name. */
const DEFAULT_SET_NAME = 'Default name';

/**
 * One obi-one `NamedTuple` of neuron IDs. `raw` is the entry as stored, so an
 * edit keeps any keys this element does not show (the assistant may write
 * `type`, for one).
 */
type TIdSet = { name: string | undefined; elements: number[]; raw: Record<string, ConfigValue> };

function readIdSet(value: unknown): TIdSet {
  const raw = isPlainObject(value) ? value : {};
  const elements = Array.isArray(raw.elements)
    ? (raw.elements as unknown[]).filter((id): id is number => typeof id === 'number')
    : [];
  return {
    name: typeof raw.name === 'string' ? raw.name : undefined,
    elements: [...new Set(elements)].sort((a, b) => a - b),
    raw,
  };
}

function writeIdSet(set: TIdSet): ConfigValue {
  return {
    ...set.raw,
    ...(set.name === undefined ? {} : { name: set.name }),
    elements: set.elements,
  };
}

const effectiveName = (set: TIdSet) => (set.name ?? DEFAULT_SET_NAME).trim();

function nextSetName(sets: TIdSet[]): string {
  const taken = new Set(sets.map(effectiveName));
  let n = sets.length + 1;
  while (taken.has(`Set ${n}`)) n += 1;
  return `Set ${n}`;
}

/**
 * A note, not an error: obi-one accepts any names (the platform files each
 * scan point under its index), but the results list each point by its set's
 * name, so blank or repeated names are hard to tell apart there.
 */
function setNameNote(sets: TIdSet[], index: number): string | undefined {
  const name = effectiveName(sets[index]);
  if (!name) return 'Name this set to tell its results apart';
  if (sets.some((other, j) => j !== index && effectiveName(other) === name))
    return 'Another set has this name, so their results will be hard to tell apart';
}

/**
 * The single value a scan over ID sets collapses to: its first non-empty set.
 *
 * Exported because the "back to a single value" control lives on the field's
 * title row, which `Block` owns.
 */
export function neuronIdsSingleValue(value: unknown): ConfigValue {
  if (!Array.isArray(value)) return (value ?? null) as ConfigValue;
  const first = value.map(readIdSet).find((set) => set.elements.length > 0);
  return first ? writeIdSet(first) : null;
}

function idCountLabel(total: number): string {
  if (total === 0) return 'No IDs yet';
  return total === 1 ? '1 ID' : `${total.toLocaleString()} IDs`;
}

export default function NeuronIds({
  value,
  disabled,
  allowMultiple,
  onChange,
}: {
  value: ConfigValue;
  disabled: boolean;
  /** false when the schema has no array branch, so the IDs cannot be scanned */
  allowMultiple: boolean;
  onChange: (value: ConfigValue) => void;
}) {
  const multiple = Array.isArray(value);

  // Set whose add box takes the cursor once it mounts: the one a + just added.
  const focusSetRef = useRef<number | null>(null);
  const focusIfAdded = (i: number) => (input: HTMLInputElement | null) => {
    if (input && focusSetRef.current === i) {
      focusSetRef.current = null;
      input.focus();
    }
  };

  const sets = useMemo(
    () => (Array.isArray(value) ? value.map(readIdSet) : [readIdSet(value)]),
    [value]
  );

  const writeSets = (next: TIdSet[]) => onChange(next.map(writeIdSet));
  const emptySet = (name: string): TIdSet => ({ name, elements: [], raw: {} });

  if (!multiple) {
    const only = sets[0];
    const ids = only.elements;
    return (
      <IdSetCard
        ids={ids}
        disabled={disabled}
        onIdsChange={(next) =>
          onChange(next.length ? writeIdSet({ ...only, elements: next }) : null)
        }
        title={
          <span
            className={cn('text-sm', ids.length ? 'text-primary-9 font-medium' : 'text-neutral-4')}
          >
            {idCountLabel(ids.length)}
          </span>
        }
        actions={
          !disabled && (
            <>
              {allowMultiple && (
                <SweepIconButton
                  label="Scan over several sets of IDs"
                  hint={ScanHint.expandIdSets}
                  testId="scan-config-neuron-ids-expand"
                  onClick={() => {
                    // Open with an empty second set, so one press is enough
                    // to start a scan. A name given before is kept.
                    const first = { ...only, name: only.name ?? 'Set 1' };
                    focusSetRef.current = 1;
                    writeSets([first, emptySet(nextSetName([first]))]);
                  }}
                >
                  <RiAddLine className="size-3.5" />
                </SweepIconButton>
              )}
              {ids.length > 0 && (
                <SweepIconButton label="Remove all IDs" onClick={() => onChange(null)}>
                  <RiDeleteBinLine className="size-3.5" />
                </SweepIconButton>
              )}
            </>
          )
        }
      />
    );
  }

  return (
    <div className="flex w-full flex-col gap-2">
      {sets.map((set, i) => {
        const nameNote = setNameNote(sets, i);
        const isLast = i === sets.length - 1;
        const shownName = set.name ?? '';
        return (
          <IdSetCard
            // biome-ignore lint/suspicious/noArrayIndexKey: sets are positional
            key={i}
            ids={set.elements}
            disabled={disabled}
            invalid={set.elements.length === 0}
            note={nameNote}
            inputRef={focusIfAdded(i)}
            onIdsChange={(next) =>
              writeSets(sets.map((other, j) => (j === i ? { ...other, elements: next } : other)))
            }
            title={
              <>
                {/* An unnamed set shows obi-one's default as the placeholder,
                    so what you see is what the results will be called. */}
                <input
                  type="text"
                  value={shownName}
                  placeholder={DEFAULT_SET_NAME}
                  disabled={disabled}
                  aria-label={`Name of set ${i + 1}`}
                  spellCheck={false}
                  size={Math.max((shownName || DEFAULT_SET_NAME).length, 4)}
                  className={cn(
                    'text-primary-9 placeholder:text-neutral-3 min-w-0 rounded-sm border-b bg-transparent px-0.5 text-sm font-medium outline-none',
                    'hover:border-neutral-3 focus:border-primary-8 border-transparent transition-colors'
                  )}
                  onChange={(e) =>
                    writeSets(
                      sets.map((other, j) => (j === i ? { ...other, name: e.target.value } : other))
                    )
                  }
                />
                <span className="text-neutral-4 shrink-0 text-xs">
                  {idCountLabel(set.elements.length)}
                </span>
              </>
            }
            actions={
              !disabled && (
                <>
                  {isLast && (
                    <SweepIconButton
                      label="Add a set"
                      hint={ScanHint.addIdSet}
                      testId="scan-config-neuron-ids-add"
                      onClick={() => {
                        focusSetRef.current = sets.length;
                        writeSets([...sets, emptySet(nextSetName(sets))]);
                      }}
                    >
                      <RiAddLine className="size-3.5" />
                    </SweepIconButton>
                  )}
                  {sets.length >= 2 && (
                    <SweepIconButton
                      label="Remove this set"
                      testId="scan-config-neuron-ids-remove"
                      onClick={() => {
                        const remaining = sets.filter((_, j) => j !== i);
                        // One set left is no longer a scan: back to the single card.
                        if (remaining.length === 1) {
                          const [last] = remaining;
                          onChange(last.elements.length ? writeIdSet(last) : null);
                        } else {
                          writeSets(remaining);
                        }
                      }}
                    >
                      <RiDeleteBinLine className="size-3.5" />
                    </SweepIconButton>
                  )}
                </>
              )
            }
          />
        );
      })}
    </div>
  );
}

/**
 * One set of IDs: a header (title, copy, edit, then the caller's actions), the
 * IDs as chips, and an input for adding more. Edit swaps the chips for a text
 * editor holding every ID.
 */
function IdSetCard({
  ids,
  disabled,
  invalid = false,
  note,
  title,
  actions,
  onIdsChange,
  inputRef,
}: {
  ids: number[];
  disabled: boolean;
  invalid?: boolean;
  /** shown under the header in muted amber: advice, not a blocking error */
  note?: string;
  title: ReactNode;
  actions?: ReactNode;
  onIdsChange: (ids: number[]) => void;
  /** ref for the add-IDs input, so a newly added set can take the cursor */
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [edit, setEdit] = useState(false);
  // The editor's buffer only. Copy and the chips read `ids`, so neither goes
  // stale when the IDs change elsewhere.
  const [text, setText] = useState('');
  const [isTextValid, setIsTextValid] = useState(true);

  const visible = useMemo(() => {
    if (ids.length <= VISIBLE_AT_EACH_END * 2) return { head: ids, hidden: 0, tail: [] };
    return {
      head: ids.slice(0, VISIBLE_AT_EACH_END),
      hidden: ids.length - VISIBLE_AT_EACH_END * 2,
      tail: ids.slice(-VISIBLE_AT_EACH_END),
    };
  }, [ids]);

  const openEditor = () => {
    setText(ids.join(', '));
    setIsTextValid(true);
    setEdit(true);
  };

  const chip = (id: number) => (
    <IdChip
      key={id}
      id={id}
      disabled={disabled}
      onRemove={() => onIdsChange(ids.filter((other) => other !== id))}
    />
  );

  return (
    <div
      className={cn(
        'flex w-full flex-col gap-3 rounded-lg border bg-white p-3',
        invalid ? 'border-error' : 'border-neutral-2'
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5">
          <div className="mr-auto flex min-w-0 items-center gap-2">{title}</div>
          {!edit && ids.length > 0 && <CopyButton textToCopy={ids.join(', ')} />}
          {!edit && (!disabled || ids.length > 0) && (
            <SweepIconButton
              label={disabled ? 'View as text' : 'Edit as text'}
              onClick={openEditor}
            >
              <RiPencilLine className="size-3.5" />
            </SweepIconButton>
          )}
          {!edit && actions}
        </div>
        {note && <span className="text-xs text-amber-600">{note}</span>}
      </div>

      {!edit && ids.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visible.head.map(chip)}
          {visible.hidden > 0 && (
            <button
              type="button"
              className={cn(
                'inline-flex h-6 cursor-pointer items-center rounded-full border border-dashed px-2.5',
                'border-neutral-3 text-neutral-4 text-xs transition-colors',
                'hover:border-primary-8 hover:text-primary-8'
              )}
              title={disabled ? 'View all IDs' : 'View or edit all IDs'}
              onClick={openEditor}
            >
              {visible.hidden.toLocaleString()} more
            </button>
          )}
          {visible.tail.map(chip)}
        </div>
      )}

      {!edit && !disabled && (
        <IdsInput
          inputRef={inputRef}
          maxLength={1000}
          onAdd={(added) => onIdsChange([...new Set([...ids, ...added])].sort((a, b) => a - b))}
        />
      )}

      {edit && (
        <>
          <div className="border-neutral-2 overflow-hidden rounded-md border">
            <NumberEditor
              value={text}
              setIsTextValid={setIsTextValid}
              setValue={setText}
              disabled={disabled}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-neutral-4 mr-auto text-xs">
              {disabled ? '' : 'Separate IDs with commas, spaces or new lines.'}
            </span>
            <Button type="text" size="small" onClick={() => setEdit(false)}>
              {disabled ? 'Close' : 'Cancel'}
            </Button>
            {!disabled && (
              <Button
                type="primary"
                size="small"
                shape="round"
                disabled={!isTextValid}
                onClick={() => {
                  onIdsChange(parseCsvIntegers(text));
                  setEdit(false);
                }}
              >
                Apply
              </Button>
            )}
          </div>
        </>
      )}
    </div>
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

function IdChip({
  id,
  disabled,
  onRemove,
}: {
  id: number;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={cn(
        'bg-primary-0 text-primary-8 inline-flex h-6 items-center gap-0.5 rounded-full pl-2.5 text-xs font-medium tabular-nums',
        disabled ? 'pr-2.5' : 'pr-1'
      )}
    >
      {id}
      {!disabled && (
        <button
          type="button"
          aria-label={`Remove ID ${id}`}
          title="Remove"
          className="text-primary-8/60 hover:bg-primary-8 inline-flex size-4 cursor-pointer items-center justify-center rounded-full transition-colors hover:text-white"
          onClick={onRemove}
        >
          <RiCloseLine className="size-3" />
        </button>
      )}
    </span>
  );
}

function CopyButton({ textToCopy }: { textToCopy: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // biome-ignore lint/suspicious/noConsole: Error logging required
      console.error('Clipboard write failed:', err);
    }
  };

  return (
    <SweepIconButton label={copied ? 'Copied' : 'Copy IDs'} onClick={handleCopy}>
      {copied ? <RiCheckLine className="size-3.5" /> : <RiFileCopyLine className="size-3.5" />}
    </SweepIconButton>
  );
}

const isValidSegment = (segment: string) => /^\s*\d*\s*$/.test(segment);

/**
 * Text input that tints any segment that is not a number.
 *
 * The input's own text is transparent; a backdrop behind it renders the same
 * text with the tints, kept aligned by mirroring the input's scroll.
 */
function IdsInput({
  onAdd,
  maxLength,
  inputRef,
}: {
  onAdd: (ids: number[]) => void;
  maxLength: number;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [value, setValue] = useState('');
  const backdropRef = useRef<HTMLDivElement>(null);

  const segments = value.split(',');
  const invalid = segments.some((segment) => !isValidSegment(segment));
  const canAdd = !invalid && value.replaceAll(',', '').trim() !== '';

  const add = () => {
    if (!canAdd) return;
    onAdd(parseCsvIntegers(value));
    setValue('');
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <div
          className={cn(
            'relative flex min-w-0 flex-1 items-center overflow-hidden rounded-md border bg-white transition-colors',
            invalid
              ? 'border-error'
              : 'border-neutral-2 hover:border-primary-5 focus-within:border-primary-8'
          )}
        >
          <div
            ref={backdropRef}
            className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre px-3 py-1 font-mono text-sm leading-6"
            aria-hidden="true"
          >
            {segments.map((segment, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
              <Fragment key={index}>
                <span
                  className={
                    isValidSegment(segment)
                      ? 'text-neutral-7'
                      : 'rounded-sm bg-red-100 text-red-600 ring-2 ring-red-100'
                  }
                >
                  {segment}
                </span>
                {index < segments.length - 1 && <span className="text-neutral-7">,</span>}
              </Fragment>
            ))}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => {
              if (e.target.value.length <= maxLength) setValue(e.target.value);
            }}
            onScroll={(e: React.UIEvent<HTMLInputElement>) => {
              if (backdropRef.current) backdropRef.current.scrollLeft = e.currentTarget.scrollLeft;
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            maxLength={maxLength}
            spellCheck={false}
            placeholder="Add IDs, e.g. 12, 40, 7"
            aria-label="Add IDs, separated by commas"
            className="placeholder:text-neutral-3 z-10 block w-full bg-transparent px-3 py-1 font-mono text-sm leading-6 text-transparent caret-black outline-none placeholder:font-sans"
          />
        </div>
        {/* An enter arrow, not a +: the header's + adds a whole set. */}
        <SweepIconButton label="Add these IDs (Enter)" disabled={!canAdd} onClick={add}>
          <RiCornerDownLeftLine className="size-3.5" />
        </SweepIconButton>
      </div>

      {(invalid || value.length >= maxLength) && (
        <div className="flex justify-between text-xs text-red-500">
          <span>{invalid ? 'Use only numbers, separated by commas.' : ''}</span>
          {value.length >= maxLength && (
            <span>
              {value.length} / {maxLength} characters
            </span>
          )}
        </div>
      )}
    </div>
  );
}
