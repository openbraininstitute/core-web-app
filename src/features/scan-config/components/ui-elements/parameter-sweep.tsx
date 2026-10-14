import {
  RiAddLine,
  RiArrowGoBackLine,
  RiDeleteBinLine,
  RiEyeFill,
  RiEyeLine,
} from '@remixicon/react';
import { isNil } from 'es-toolkit/compat';
import { useAtomValue, useSetAtom } from 'jotai';
import { createContext, type ReactNode, useContext, useMemo } from 'react';

import {
  resolveScanIndex,
  scanValueSelectionAtom,
  selectScanValueAtom,
} from '@/features/scan-config/components/model-preview/electrode-locations-overlay';
import { ScanConfigUIElementDict } from '@/features/scan-config/types';
import {
  FancyActions,
  FancyField,
  type FancyInputAction,
  FancyNumberInput,
} from '@/ui/molecules/fancy-input';

import type { FancyChrome } from '@/ui/molecules/fancy-input';

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
  chrome,
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
  chrome?: FancyChrome;
}) {
  const isSweep = Array.isArray(value);
  const values = isSweep ? value : [value];

  // Only sweeps inside a ScanValueSelectorProvider (today: electrode locations)
  // offer per-value eyes; everywhere else this stays null and nothing renders.
  const scope = useContext(ScanValueSelectorContext);
  const selection = useAtomValue(scanValueSelectionAtom);
  const setSelected = useSetAtom(selectScanValueAtom);
  // Kept separate from the eyes: add/remove must move the selection even when no
  // eye is on screen yet (a one-value sweep gaining its second value renders its
  // first eye and its selection in the same commit).
  const selectValue = scope
    ? (index: number) => setSelected({ block: scope.blockName, param: k, index })
    : null;
  const activeIndex =
    scope && values.length > 1
      ? resolveScanIndex(selection, scope.blockName, k, values.length)
      : null;

  /** Index that should stay active once the value at `removed` is gone. */
  function activeIndexAfterRemoval(removed: number): number {
    const active = resolveScanIndex(selection, scope?.blockName ?? '', k, values.length);
    // Removing an earlier value shifts the active one down; removing the active
    // value itself falls back to the first.
    if (removed < active) return active - 1;
    return removed === active ? 0 : active;
  }

  function error(v: number | null): string | undefined {
    if (isNil(v)) return undefined;
    if (!isNil(min) && v < min) return `Value should be greater than or equal to ${min}`;
    if (!isNil(max) && v > max) return `Value should be less than or equal to ${max}`;
    if (!isNil(exclusiveMin) && v <= exclusiveMin)
      return `Value should be greater than ${exclusiveMin}`;
    if (!isNil(exclusiveMax) && v >= exclusiveMax)
      return `Value should be less than ${exclusiveMax}`;
  }

  const setAt = (i: number, next: number | null) => {
    const updated = [...values];
    updated[i] = next;
    onChange(updated);
  };

  // Per-value controls, in a fixed order: eye, then remove.
  const rowActions = (i: number): Array<FancyInputAction> => {
    const actions: Array<FancyInputAction> = [];
    if (activeIndex !== null) {
      const active = activeIndex === i;
      actions.push({
        key: 'eye',
        label: `Show value ${i + 1} in the preview`,
        pressed: active,
        icon: active ? <RiEyeFill className="size-3.5" /> : <RiEyeLine className="size-3.5" />,
        onClick: () => selectValue?.(i),
      });
    }
    if (!disabled && values.length >= 2) {
      actions.push({
        key: 'remove',
        label: 'Remove this value',
        'data-testid': 'scan-config-sweep-remove',
        icon: <RiDeleteBinLine className="size-3.5" />,
        onClick: () => {
          const updated = [...values];
          updated.splice(i, 1);
          // Keep the eye on the same value it was on.
          selectValue?.(activeIndexAfterRemoval(i));
          onChange(updated);
        },
      });
    }
    return actions;
  };

  // Field-level controls on the top border: back to one value, and add.
  const borderActions: Array<FancyInputAction> = [];
  if (!disabled && isSweep) {
    borderActions.push({
      key: 'collapse',
      label: 'Use a single value',
      'data-testid': 'scan-config-sweep-collapse',
      icon: <RiArrowGoBackLine className="size-3" />,
      onClick: () => onChange(sweepSingleValue(values)),
    });
  }
  if (!disabled && (isSweep || allowMultiple)) {
    borderActions.push({
      key: 'add',
      // One click from a single value opens the second input right away.
      label: isSweep ? 'Add a value' : 'Scan over several values',
      'data-testid': isSweep ? 'scan-config-sweep-add' : 'scan-config-sweep-expand',
      icon: <RiAddLine className="size-3.5" />,
      onClick: () => {
        // The value you just added is the one you want to see, so it becomes active.
        selectValue?.(values.length);
        onChange([...values, null]);
      },
    });
  }

  if (!isSweep) {
    return (
      <div data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_single`}>
        <FancyNumberInput
          {...chrome}
          data-testid="scan-config-sweep-value"
          disabled={disabled}
          value={value}
          onValueChange={onChange}
          error={error(value) ?? chrome?.error}
          borderActions={borderActions}
        />
      </div>
    );
  }

  // A sweep: the field frame carries the title and controls; every value is the same row in it.
  return (
    <div data-scan-config-block-element={`${ScanConfigUIElementDict.FloatParameterSweep}_multiple`}>
      <FancyField
        {...chrome}
        group
        disabled={disabled}
        borderActions={<FancyActions onBorder actions={borderActions} disabled={disabled} />}
      >
        <div className="flex flex-col gap-2 px-2 pt-4 pb-2">
          {values.map((v, i) => (
            <FancyNumberInput
              // biome-ignore lint/suspicious/noArrayIndexKey: values are positional
              key={k + i}
              aria-label={`${chrome?.label ?? 'Value'} ${i + 1}`}
              data-testid="scan-config-sweep-value"
              disabled={disabled}
              value={v}
              onValueChange={(next) => setAt(i, next)}
              error={error(v)}
              variant={v === null ? 'error' : 'default'}
              actions={rowActions(i)}
            />
          ))}
        </div>
      </FancyField>
    </div>
  );
}
