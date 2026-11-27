'use client';

import { WarningFilled } from '@ant-design/icons';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { useState } from 'react';

import { Chevron } from '@/features/scan-config/components/components';
import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
import { useSetConfig, useWholeConfig } from '@/features/scan-config/use-config-store';
import { cn } from '@/utils/css-class';

import {
  coupledSize,
  gridSize,
  type IScanDimension,
  MIN_COUPLED_SIZE,
  ScanMode,
  scanDimensions,
  type TScanMode,
  withCoupledSize,
} from './scan-dimensions';

import type { ConfigSchema } from '@/features/scan-config/types';

const MODE_HINT: Record<TScanMode, string> = {
  [ScanMode.Grid]: 'Every combination of the scanned values runs.',
  [ScanMode.Coupled]:
    'The scanned fields step together: their first values run as one configuration, then their second, and so on.',
};

const STEP_BUTTON = cn(
  'inline-flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full',
  'text-primary-8 bg-white ring-1 ring-neutral-2 transition-colors',
  'hover:bg-primary-8 hover:text-white hover:ring-primary-8',
  'disabled:pointer-events-none disabled:opacity-40'
);

const configurations = (count: number) =>
  `${count} ${count === 1 ? 'configuration' : 'configurations'}`;

/**
 * What the config scans and how the scanned fields combine, on one line: Grid or Coupled, the
 * size, and a warning while a field has values to fill in. It opens upwards onto the fields.
 */
export function ScanModePanel({
  schema,
  mode,
  disabled,
  onModeChange,
  onPick,
}: {
  schema: ConfigSchema;
  mode: TScanMode;
  disabled: boolean;
  onModeChange: (mode: TScanMode) => void;
  /** Open the block holding a scanned field. */
  onPick: (dimension: IScanDimension) => void;
}) {
  const config = useWholeConfig();
  const setConfig = useSetConfig();
  const [open, setOpen] = useState(false);
  const dimensions = scanDimensions(config, schema);
  if (dimensions.length === 0) return null;

  const coupled = mode === ScanMode.Coupled;
  const size = coupledSize(dimensions);
  const canGrow = dimensions.some((dimension) => dimension.blankable);
  const resize = (next: number) => setConfig(withCoupledSize(config, schema, next));

  const unfilledIn = (dimension: IScanDimension) =>
    dimension.values.filter((value) => value === null).length;
  const isShort = (dimension: IScanDimension) => coupled && dimension.values.length < size;
  const incomplete = dimensions.some((d) => unfilledIn(d) > 0 || isShort(d));
  const total = coupled ? size : gridSize(dimensions);

  return (
    <section
      data-testid="scan-config-scan-panel"
      data-scan-mode={mode}
      aria-label="Scan"
      className="border-neutral-2 mb-3 rounded-xl border bg-white px-3 py-2"
    >
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
        inert={!open}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="flex max-h-40 flex-col gap-0.5 overflow-y-auto text-xs">
            {dimensions.map((dimension) => {
              const short = isShort(dimension);
              const unfilled = unfilledIn(dimension);
              return (
                <li key={JSON.stringify(dimension.path)}>
                  <button
                    type="button"
                    data-testid="scan-config-scan-dimension"
                    title="Show this field"
                    onClick={() => onPick(dimension)}
                    className="hover:bg-neutral-1 flex w-full cursor-pointer items-baseline gap-2 rounded px-1 py-0.5 text-left"
                  >
                    <span className="min-w-0 flex-1 truncate">
                      <span className="text-neutral-4">{dimension.owner} · </span>
                      <span className="text-primary-9">{renderMathInText(dimension.label)}</span>
                    </span>
                    {unfilled > 0 && (
                      <WarningFilled
                        data-testid="scan-config-scan-dimension-unfilled"
                        title={
                          unfilled === 1 ? '1 value to fill in' : `${unfilled} values to fill in`
                        }
                        className="shrink-0 self-center text-[11px] text-yellow-400!"
                      />
                    )}
                    <span
                      className={cn(
                        'shrink-0 font-semibold tabular-nums',
                        short ? 'text-yellow-800' : 'text-primary-9'
                      )}
                    >
                      {short ? `${dimension.values.length} of ${size}` : dimension.values.length}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-neutral-2 mt-1.5 mb-2 border-b" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <h4 className="text-primary-9 shrink-0 text-sm font-semibold">Scan:</h4>
        <div className="flex shrink-0 items-center gap-1.5">
          <ModeLabel
            mode={ScanMode.Grid}
            label="Grid"
            active={!coupled}
            disabled={disabled}
            onPick={onModeChange}
          />
          <button
            type="button"
            role="switch"
            aria-checked={coupled}
            aria-label="Couple the scanned fields"
            data-testid="scan-config-scan-mode-switch"
            disabled={disabled}
            onClick={() => onModeChange(coupled ? ScanMode.Grid : ScanMode.Coupled)}
            className="bg-primary-8 relative h-4 w-7 shrink-0 cursor-pointer rounded-full disabled:cursor-default disabled:opacity-50"
          >
            <span
              className={cn(
                'absolute top-0.5 left-0.5 size-3 rounded-full bg-white transition-transform motion-reduce:transition-none',
                coupled && 'translate-x-3'
              )}
            />
          </button>
          <ModeLabel
            mode={ScanMode.Coupled}
            label="Coupled"
            active={coupled}
            disabled={disabled}
            onPick={onModeChange}
          />
        </div>

        {coupled ? (
          <div className="flex items-center gap-1" title={configurations(size)}>
            <button
              type="button"
              aria-label="One configuration fewer"
              title="Remove the last value of every scanned field"
              data-testid="scan-config-coupled-fewer"
              disabled={disabled || size <= MIN_COUPLED_SIZE}
              onClick={() => resize(size - 1)}
              className={STEP_BUTTON}
            >
              <RiSubtractLine className="size-3" />
            </button>
            <span
              data-testid="scan-config-coupled-size"
              className="text-primary-9 min-w-5 text-center text-sm font-bold tabular-nums"
            >
              {size}
            </span>
            <button
              type="button"
              aria-label="One configuration more"
              title="Add a value to every scanned field"
              data-testid="scan-config-coupled-more"
              disabled={disabled || !canGrow}
              onClick={() => resize(size + 1)}
              className={STEP_BUTTON}
            >
              <RiAddLine className="size-3" />
            </button>
          </div>
        ) : (
          <span
            data-testid="scan-config-grid-size"
            title={configurations(total)}
            className="text-primary-9 min-w-0 truncate text-xs font-bold tabular-nums"
          >
            {total}
            {dimensions.length > 1 &&
              ` = ${dimensions.map((dimension) => dimension.values.length).join(' × ')}`}
          </span>
        )}

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {incomplete && (
            <WarningFilled
              data-testid="scan-config-scan-incomplete"
              title="Some scanned fields have values to fill in"
              className="text-sm text-yellow-400!"
            />
          )}
          <button
            type="button"
            data-testid="scan-config-scan-expand"
            aria-expanded={open}
            aria-label={open ? 'Hide the scanned fields' : 'Show the scanned fields'}
            onClick={() => setOpen((was) => !was)}
            className="text-primary-8 hover:bg-neutral-1 flex size-6 cursor-pointer items-center justify-center rounded-full transition-colors"
          >
            <Chevron rotate={open ? 90 : -90} />
          </button>
        </div>
      </div>
    </section>
  );
}

/** One side of the Grid/Coupled switch: pressed, it is picked. */
function ModeLabel({
  mode,
  label,
  active,
  disabled,
  onPick,
}: {
  mode: TScanMode;
  label: string;
  active: boolean;
  disabled: boolean;
  onPick: (mode: TScanMode) => void;
}) {
  return (
    <button
      type="button"
      tabIndex={-1}
      data-testid={`scan-config-scan-mode-${mode}`}
      title={MODE_HINT[mode]}
      disabled={disabled}
      onClick={() => {
        if (!active) onPick(mode);
      }}
      className={cn(
        'cursor-pointer text-xs transition-colors disabled:cursor-default',
        active ? 'text-primary-9 font-bold' : 'text-neutral-4 hover:text-primary-8'
      )}
    >
      {label}
    </button>
  );
}
