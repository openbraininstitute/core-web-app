import { RiAddLine, RiDeleteBinLine, RiEyeFill, RiEyeLine } from '@remixicon/react';
import { InputNumber } from 'antd';
import { isNil } from 'es-toolkit/compat';
import { useAtomValue, useSetAtom } from 'jotai';
import { createContext, Fragment, type ReactNode, useContext, useMemo } from 'react';

import {
  resolveScanIndex,
  scanValueSelectionAtom,
  selectScanValueAtom,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
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

/**
 * The scalar a sweep collapses to — its first usable value.
 *
 * Exported because the "back to a single value" control lives on the field's
 * title row, which `Block` owns, not inside this component.
 */
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
        // lets Block hide the field's description while this hint shows
        hint && 'scan-hint-trigger',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );

  if (!hint) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="top" sideOffset={6} className="max-w-64 text-left text-wrap">
        <span className="block font-semibold">{label}</span>
        <span className="block">{hint}</span>
      </TooltipContent>
    </Tooltip>
  );
}

/** Hover text for the + that turns a field into a scan, or adds to one. */
export const ScanHint = {
  expandValues:
    'Each value runs as its own configuration. Scan more than one field and every combination runs.',
  addValue: 'Add another value to the scan. Each value runs as its own configuration.',
  expandIdSets:
    'Each set of neuron IDs runs as its own configuration. Scan more than one field and every combination runs.',
  addIdSet:
    'Add another set to the scan. Each set runs as its own configuration, and its results are labelled with its name.',
  addGroup: 'Add another group to the scan. Each group runs as its own configuration.',
  addToList: 'Each one you add runs as its own configuration.',
} as const;

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
      <div
        className="relative"
        data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_single`}
      >
        <InputNumber
          data-testid="scan-config-sweep-value"
          controls={false}
          disabled={disabled}
          status={errorMessage ? 'error' : undefined}
          value={value}
          onChange={(v) => {
            onChange(v);
          }}
          // room for the floating add button so long values never run under it
          className="w-full! [&_input]:pr-9"
        />

        {errorMessage && <span className="text-red-500">{errorMessage}</span>}

        {!disabled && allowMultiple && (
          <SweepIconButton
            label="Scan over several values"
            hint={ScanHint.expandValues}
            testId="scan-config-sweep-expand"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => {
              // Open with an empty second value, so one press is enough to
              // start a scan. The preview stays on the value already there.
              selectValue?.(0);
              onChange([...multipleValues, null]);
            }}
          >
            <RiAddLine className="size-3.5" />
          </SweepIconButton>
        )}
      </div>
    );
  }

  if (mode === 'multiple') {
    return (
      <div
        data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_multiple`}
      >
        {/* No collapse control here: it renders on the field's title row (see
            Block), which is the only way it can truly line up with the label. */}
        <div className="border-neutral-2 rounded-lg border bg-white p-3">
          <div className="flex flex-col gap-1">
            {multipleValues.map((v, i) => {
              const errorMessage = !isNil(v) ? error(v) : undefined;
              const showAdd = !disabled && i === multipleValues.length - 1;
              const showRemove = !disabled && multipleValues.length >= 2;
              const isActiveValue = valueSelector?.activeIndex === i;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: values are positional
                <Fragment key={k + i}>
                  <div className="flex w-full items-center gap-1.5">
                    <div className="relative min-w-0 flex-1">
                      <InputNumber
                        data-testid="scan-config-sweep-value"
                        controls={false}
                        // room for the buttons inside the field
                        className={cn('w-full!', {
                          '[&_input]:pr-9': showRemove !== showAdd,
                          '[&_input]:pr-16': showRemove && showAdd,
                        })}
                        status={v === null || errorMessage ? 'error' : undefined}
                        value={v}
                        disabled={disabled}
                        onChange={(newValue) => {
                          const updated = [...multipleValues];
                          updated[i] = newValue;
                          onChange(updated);
                        }}
                      />

                      {/* Bin always at the right edge so it lines up on every
                          row; add sits before it, on the last row only. */}
                      {(showRemove || showAdd) && (
                        <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
                          {showAdd && (
                            <SweepIconButton
                              label="Add a value"
                              hint={ScanHint.addValue}
                              testId="scan-config-sweep-add"
                              onClick={() => {
                                // The value you just added is the one you want
                                // to see, so it becomes the active coordinate.
                                selectValue?.(multipleValues.length);
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
                                // Keep the eye on the same value it was on.
                                selectValue?.(activeIndexAfterRemoval(i));
                                // One value left is no longer a scan: back to
                                // the single field.
                                onChange(updated.length === 1 ? updated[0] : updated);
                              }}
                            >
                              <RiDeleteBinLine className="size-3.5" />
                            </SweepIconButton>
                          )}
                        </div>
                      )}
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
