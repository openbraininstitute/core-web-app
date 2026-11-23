import { RiAddLine, RiCloseLine, RiDeleteBinLine, RiEyeFill, RiEyeLine } from '@remixicon/react';
import { InputNumber } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  createContext,
  Fragment,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  resolveScanIndex,
  scanValueSelectionAtom,
  selectScanValueAtom,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { ScanHint, ScanHintTooltip } from '@/features/scan-config/components/shared/scan-hint';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { cn } from '@/utils/css-class';

/**
 * Marks the form subtree whose parameter sweeps may pick one active value.
 *
 * Why a context and not a prop: sweeps are rendered generically by
 * `UIElementRender` for every workflow, several levels below the only component
 * that knows they feed a 3D preview (the electrode block dictionary). Without a
 * provider there is no eye, so every other workflow is untouched.
 */
const ScanValueSelectorContext = createContext<{ blockName: string } | null>(null);

export function ScanValueSelectorProvider({
  blockName,
  children,
}: {
  blockName: string;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ blockName }), [blockName]);
  return (
    <ScanValueSelectorContext.Provider value={value}>{children}</ScanValueSelectorContext.Provider>
  );
}

/** The scalar a sweep collapses to — its first usable value. */
export function sweepSingleValue(value: null | number | (number | null)[]): number | null {
  if (Array.isArray(value)) return value.find((entry) => !isNil(entry)) ?? null;
  return isNil(value) ? null : value;
}

/**
 * Round icon control shared by every sweep action (add / remove / collapse / eye).
 *
 * Why one component: the icons sit next to inputs of varying width, so they need
 * a fixed footprint and a permanent white pill to stay legible — styling them
 * ad hoc drifted between rows.
 */
export function SweepIconButton({
  label,
  hint,
  testId,
  onClick,
  pressed,
  disabled,
  className,
  children,
}: {
  label: string;
  /** Shown under the label in a hover tooltip, in place of the browser's own. */
  hint?: ReactNode;
  /** E2E handle. The label is product copy; this is what a test addresses. */
  testId?: string;
  onClick: () => void;
  /** Set for toggles so screen readers announce the active value. */
  pressed?: boolean;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const button = (
    <button
      type="button"
      data-testid={testId}
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      title={hint ? undefined : label}
      className={cn(
        'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'text-primary-8 bg-white ring-1 ring-neutral-200 transition-colors',
        'hover:bg-primary-8 hover:text-white hover:ring-primary-8',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (!hint) return button;
  return (
    <ScanHintTooltip title={label} hint={hint}>
      {button}
    </ScanHintTooltip>
  );
}

/** "Use a single value" for a field's title row: shown while the sweep holds a list. */
export function SweepCollapseButton({
  value,
  name,
  disabled,
  onChange,
}: {
  value: null | number | (number | null)[];
  /** Tells apart several buttons in one form, e.g. one per section list. */
  name?: string;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  if (disabled || !Array.isArray(value)) return null;
  return (
    <SweepIconButton
      label={name ? `Use a single value for ${name}` : 'Use a single value'}
      testId="scan-config-sweep-collapse"
      className="ml-auto"
      onClick={() => onChange(sweepSingleValue(value))}
    >
      <RiCloseLine className="size-3.5" />
    </SweepIconButton>
  );
}

/**
 * The buttons in a value field's suffix. antd sets `pointer-events: none` on the
 * suffix, and focuses the field's input on any click inside it, which would
 * pull the cursor back to this row before a + moves it to the value it adds.
 */
function SweepFieldActions({ children }: { children: ReactNode }) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: only stops the click bubbling
    // biome-ignore lint/a11y/useKeyWithClickEvents: the buttons inside handle keys
    <span
      className="pointer-events-auto flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </span>
  );
}

/** `rows` without row `i`; with `shift`, the rows after it move up one, as after a removal. */
function withoutRow(rows: ReadonlySet<number>, i: number, shift: boolean): ReadonlySet<number> {
  if (!rows.has(i) && !shift) return rows;
  const next = new Set<number>();
  for (const row of rows) {
    if (row !== i) next.add(shift && row > i ? row - 1 : row);
  }
  return next;
}

export default function ParameterSweep({
  value,
  min,
  max,
  exclusiveMin,
  exclusiveMax,
  onChange,
  disabled,
  allowMultiple = true,
  k,
}: {
  value: null | number | (number | null)[];
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  onChange: (v: null | number | (number | null)[]) => void;
  disabled: boolean;
  /** false when the schema has no array branch, so the value cannot be swept */
  allowMultiple?: boolean;
  k: string;
}) {
  const mode: 'single' | 'multiple' = Array.isArray(value) ? 'multiple' : 'single';

  const multipleValues = (() => {
    if (Array.isArray(value)) return value;
    return [value];
  })();

  // Row a + asks to take the cursor. One-shot: if the value has not grown by the
  // time this commits, nothing is focused, rather than some later row.
  const rowsRef = useRef<HTMLDivElement>(null);
  const [focusRow, setFocusRow] = useState<number | null>(null);
  useEffect(() => {
    if (focusRow === null) return;
    rowsRef.current?.querySelectorAll('input')[focusRow]?.focus();
    setFocusRow(null);
  }, [focusRow]);

  // Rows a + added that the user has not left yet: an empty one is not flagged
  // until then, so pressing + never shows a red field straight away.
  const [freshRows, setFreshRows] = useState<ReadonlySet<number>>(() => new Set());

  // Only sweeps inside a ScanValueSelectorProvider (today: electrode locations)
  // offer per-value eyes; everywhere else this stays null and nothing renders.
  const scope = useContext(ScanValueSelectorContext);
  const selection = useAtomValue(scanValueSelectionAtom);
  const setSelected = useSetAtom(selectScanValueAtom);
  // Kept separate from `valueSelector`: the add/remove handlers must move the
  // selection even when no eye is on screen yet (a one-value sweep gaining its
  // second value renders its first eye and its selection in the same commit).
  const selectValue = scope
    ? (index: number) => setSelected({ block: scope.blockName, param: k, index })
    : null;
  const valueSelector =
    scope && selectValue && multipleValues.length > 1
      ? {
          activeIndex: resolveScanIndex(selection, scope.blockName, k, multipleValues.length),
          onSelect: selectValue,
        }
      : null;

  /** Index that should stay active once the value at `removed` is gone. */
  function activeIndexAfterRemoval(removed: number): number {
    const active = resolveScanIndex(selection, scope?.blockName ?? '', k, multipleValues.length);
    // Removing an earlier value shifts the active one down; removing the active
    // value itself falls back to the first.
    if (removed < active) return active - 1;
    return removed === active ? 0 : active;
  }

  function error(value: number): string | undefined {
    if (!isNil(min) && value < min) return `Value should be greater than or equal to ${min}`;
    if (!isNil(max) && value > max) return `Value should be less than or equal to ${max}`;
    if (!isNil(exclusiveMin) && value <= exclusiveMin)
      return `Value should be greater than ${exclusiveMin}`;
    if (!isNil(exclusiveMax) && value >= exclusiveMax)
      return `Value should be less than ${exclusiveMax}`;
  }

  if (mode === 'single' && !Array.isArray(value)) {
    const errorMessage = !isNil(value) ? error(value) : undefined;
    return (
      <div data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_single`}>
        <InputNumber
          data-testid="scan-config-sweep-value"
          controls={false}
          disabled={disabled}
          status={errorMessage ? 'error' : undefined}
          value={value}
          onChange={(v) => {
            onChange(v);
          }}
          className="w-full!"
          suffix={
            !disabled &&
            allowMultiple && (
              <SweepFieldActions>
                <SweepIconButton
                  label="Scan over several values"
                  hint={ScanHint.expandValues}
                  testId="scan-config-sweep-expand"
                  onClick={() => {
                    // Open with an empty second value, so one press is enough to
                    // start a scan. The preview stays on the value already there.
                    selectValue?.(0);
                    // the cursor goes to the first empty value
                    setFocusRow(isNil(value) ? 0 : 1);
                    setFreshRows(new Set(isNil(value) ? [0, 1] : [1]));
                    onChange([value, null]);
                  }}
                >
                  <RiAddLine className="size-3.5" />
                </SweepIconButton>
              </SweepFieldActions>
            )
          }
        />

        {errorMessage && <span className="text-red-500">{errorMessage}</span>}
      </div>
    );
  }

  if (mode === 'multiple') {
    return (
      <div
        data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_multiple`}
      >
        {/* No collapse control here: callers put SweepCollapseButton on the title row. */}
        <div className="border-neutral-2 rounded-lg border bg-white p-3">
          <div ref={rowsRef} className="flex flex-col gap-1">
            {multipleValues.map((v, i) => {
              const errorMessage = !isNil(v) ? error(v) : undefined;
              const showAdd = !disabled && i === multipleValues.length - 1;
              const showRemove = !disabled && multipleValues.length >= 2;
              const isActiveValue = valueSelector?.activeIndex === i;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: values are positional
                <Fragment key={k + i}>
                  <div
                    data-testid="scan-config-sweep-row"
                    className="flex w-full items-center gap-1.5"
                  >
                    <div data-testid="scan-config-sweep-field" className="min-w-0 flex-1">
                      <InputNumber
                        data-testid="scan-config-sweep-value"
                        controls={false}
                        className="w-full!"
                        status={
                          (v === null && !freshRows.has(i)) || errorMessage ? 'error' : undefined
                        }
                        value={v}
                        disabled={disabled}
                        onChange={(newValue) => {
                          const updated = [...multipleValues];
                          updated[i] = newValue;
                          onChange(updated);
                        }}
                        onBlur={() => setFreshRows((rows) => withoutRow(rows, i, false))}
                        // In the suffix, so the field keeps room for them by itself.
                        // Bin last, so it lines up on every row; add on the last row only.
                        suffix={
                          (showAdd || showRemove) && (
                            <SweepFieldActions>
                              {showAdd && (
                                <SweepIconButton
                                  label="Add a value"
                                  hint={ScanHint.addValue}
                                  testId="scan-config-sweep-add"
                                  onClick={() => {
                                    // The value you just added is the one you want
                                    // to see, so it becomes the active coordinate.
                                    selectValue?.(multipleValues.length);
                                    setFocusRow(multipleValues.length);
                                    setFreshRows((rows) =>
                                      new Set(rows).add(multipleValues.length)
                                    );
                                    onChange([...multipleValues, null]);
                                  }}
                                >
                                  <RiAddLine className="size-3.5" />
                                </SweepIconButton>
                              )}
                              {showRemove && (
                                <SweepIconButton
                                  label="Remove this value"
                                  testId="scan-config-sweep-remove"
                                  onClick={() => {
                                    const updated = [...multipleValues];
                                    updated.splice(i, 1);
                                    setFreshRows((rows) => withoutRow(rows, i, true));
                                    // One value left is no longer a scan: back to the
                                    // single field, which has no value to keep an eye on.
                                    if (updated.length === 1) {
                                      onChange(updated[0]);
                                      return;
                                    }
                                    // Keep the eye on the same value it was on.
                                    selectValue?.(activeIndexAfterRemoval(i));
                                    onChange(updated);
                                  }}
                                >
                                  <RiDeleteBinLine className="size-3.5" />
                                </SweepIconButton>
                              )}
                            </SweepFieldActions>
                          )
                        }
                      />
                    </div>

                    {valueSelector && (
                      <SweepIconButton
                        label={`Show value ${i + 1} in the preview`}
                        pressed={isActiveValue}
                        // Active reads as a solid blue pill; the rest stay grey
                        // outlines so exactly one value looks selected.
                        className={
                          isActiveValue
                            ? 'bg-primary-8 ring-primary-8 text-white hover:bg-primary-9 hover:text-white'
                            : 'text-neutral-400'
                        }
                        onClick={() => valueSelector.onSelect(i)}
                      >
                        {isActiveValue ? (
                          <RiEyeFill className="size-3.5" />
                        ) : (
                          <RiEyeLine className="size-3.5" />
                        )}
                      </SweepIconButton>
                    )}
                  </div>
                  {errorMessage && <span className="text-red-500">{errorMessage}</span>}
                </Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
}
