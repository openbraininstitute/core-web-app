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
  onClick,
  pressed,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  /** Set for toggles so screen readers announce the active value. */
  pressed?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full',
        'text-primary-8 bg-white ring-1 ring-neutral-200 transition-colors',
        'hover:bg-primary-8 hover:text-white hover:ring-primary-8',
        className
      )}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function ParameterSweep({
  value,
  min,
  max,
  exclusiveMin,
  exclusiveMax,
  onChange,
  disabled,
  k,
}: {
  value: null | number | (number | null)[];
  min: number | undefined;
  max: number | undefined;
  exclusiveMin: number | undefined;
  exclusiveMax: number | undefined;
  onChange: (v: null | number | (number | null)[]) => void;
  disabled: boolean;
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
          controls={false}
          disabled={disabled}
          status={errorMessage ? 'error' : undefined}
          value={value}
          onChange={(v) => {
            onChange(v);
          }}
          // room for the floating add button so long values never run under it
          className="w-full [&_input]:pr-9"
        />

        {errorMessage && <span className="text-red-500">{errorMessage}</span>}

        {!disabled && (
          <SweepIconButton
            label="Scan over several values"
            className="absolute top-1/2 right-2 -translate-y-1/2"
            onClick={() => {
              onChange(multipleValues);
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
              const isLast = i === multipleValues.length - 1;
              const canRemove = multipleValues.length >= 2;
              const isActiveValue = valueSelector?.activeIndex === i;
              return (
                // biome-ignore lint/suspicious/noArrayIndexKey: values are positional
                <Fragment key={k + i}>
                  <div className="flex w-full items-center gap-1.5">
                    <InputNumber
                      className="min-w-0 flex-1"
                      status={v === null || errorMessage ? 'error' : undefined}
                      value={v}
                      disabled={disabled}
                      onChange={(newValue) => {
                        const updated = [...multipleValues];
                        updated[i] = newValue;
                        onChange(updated);
                      }}
                    />

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

                    {/* Fixed column order — eye, delete, add — with reserved
                        slots so add stays pinned right on every row even though
                        only the last row can use it. */}
                    {!disabled && (
                      <>
                        <span className="flex size-6 shrink-0 items-center justify-center">
                          {canRemove && (
                            <SweepIconButton
                              label="Remove this value"
                              onClick={() => {
                                const updated = [...multipleValues];
                                updated.splice(i, 1);
                                // Keep the eye on the same value it was on.
                                selectValue?.(activeIndexAfterRemoval(i));
                                onChange(updated);
                              }}
                            >
                              <RiDeleteBinLine className="size-3.5" />
                            </SweepIconButton>
                          )}
                        </span>
                        <span className="flex size-6 shrink-0 items-center justify-center">
                          {isLast && (
                            <SweepIconButton
                              label="Add a value"
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
                        </span>
                      </>
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
