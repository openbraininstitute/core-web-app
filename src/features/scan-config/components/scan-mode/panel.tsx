'use client';

import { WarningFilled } from '@ant-design/icons';
import { RiAddLine, RiSubtractLine } from '@remixicon/react';
import { Fragment } from 'react';

import { renderMathInText } from '@/features/scan-config/components/shared/render-math-in-text';
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

import type { Config, ConfigSchema } from '@/features/scan-config/types';

const MODES: readonly { mode: TScanMode; label: string; hint: string }[] = [
  { mode: ScanMode.Grid, label: 'Grid', hint: 'Every combination of the scanned values runs.' },
  {
    mode: ScanMode.Coupled,
    label: 'Coupled',
    hint: 'The scanned fields step together: their first values run as one configuration, then their second, and so on.',
  },
];

const STEP_BUTTON = cn(
  'inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full',
  'text-primary-8 bg-white ring-1 ring-neutral-2 transition-colors',
  'hover:bg-primary-8 hover:text-white hover:ring-primary-8',
  'disabled:pointer-events-none disabled:opacity-40'
);

const configurations = (count: number) =>
  `${count} ${count === 1 ? 'configuration' : 'configurations'}`;

/**
 * What the config scans and how the scanned fields combine, shown once a field holds several
 * values. Grid: the size of each dimension and their product. Coupled: one count for all of
 * them, changed here for every field at once.
 */
export function ScanModePanel({
  config,
  schema,
  mode,
  disabled,
  onModeChange,
  onConfigChange,
  onPick,
}: {
  config: Config;
  schema: ConfigSchema;
  mode: TScanMode;
  disabled: boolean;
  onModeChange: (mode: TScanMode) => void;
  onConfigChange: (config: Config) => void;
  /** Open the block holding a scanned field. */
  onPick: (dimension: IScanDimension) => void;
}) {
  const dimensions = scanDimensions(config, schema);
  if (dimensions.length === 0) return null;

  const coupled = mode === ScanMode.Coupled;
  const size = coupledSize(dimensions);
  const canGrow = dimensions.some((dimension) => dimension.blankable);
  const resize = (next: number) => onConfigChange(withCoupledSize(config, schema, next));

  return (
    <section
      data-testid="scan-config-scan-panel"
      data-scan-mode={mode}
      aria-label="Scan"
      className="border-neutral-2 mb-3 flex flex-col gap-2 rounded-xl border bg-white p-3"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-bold text-[oklch(0.704_0.04_256.788)] uppercase">Scan</h4>
        <div
          role="radiogroup"
          aria-label="How the scanned fields combine"
          className="bg-neutral-1 inline-flex rounded-full p-0.5"
        >
          {MODES.map((option) => (
            // biome-ignore lint/a11y/useSemanticElements: a pill of two, styled as buttons
            <button
              key={option.mode}
              type="button"
              role="radio"
              aria-checked={mode === option.mode}
              data-testid={`scan-config-scan-mode-${option.mode}`}
              title={option.hint}
              disabled={disabled}
              onClick={() => onModeChange(option.mode)}
              className={cn(
                'cursor-pointer rounded-full px-3 py-0.5 text-xs font-semibold transition-colors',
                'disabled:cursor-default',
                mode === option.mode ? 'bg-primary-8 text-white' : 'text-primary-8 hover:bg-white'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {coupled ? (
        <div className="flex items-center justify-between gap-2">
          <span className="text-primary-9 text-sm font-semibold">Configurations</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="One configuration fewer"
              title="Remove the last value of every scanned field"
              data-testid="scan-config-coupled-fewer"
              disabled={disabled || size <= MIN_COUPLED_SIZE}
              onClick={() => resize(size - 1)}
              className={STEP_BUTTON}
            >
              <RiSubtractLine className="size-3.5" />
            </button>
            <span
              data-testid="scan-config-coupled-size"
              className="text-primary-9 min-w-6 text-center text-sm font-bold tabular-nums"
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
              <RiAddLine className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div
          data-testid="scan-config-grid-size"
          className="text-primary-9 flex flex-wrap items-baseline gap-x-1.5 text-sm font-semibold tabular-nums"
        >
          {dimensions.length > 1 && (
            <>
              {dimensions.map((dimension, i) => (
                <Fragment key={JSON.stringify(dimension.path)}>
                  {i > 0 && <span className="text-neutral-4 font-normal">×</span>}
                  <span>{dimension.values.length}</span>
                </Fragment>
              ))}
              <span className="text-neutral-4 font-normal">=</span>
            </>
          )}
          <span>{configurations(gridSize(dimensions))}</span>
        </div>
      )}

      <ul className="flex max-h-32 flex-col gap-0.5 overflow-y-auto text-xs">
        {dimensions.map((dimension) => {
          const short = coupled && dimension.values.length < size;
          const unfilled = dimension.values.filter((value) => value === null).length;
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
                    title={unfilled === 1 ? '1 value to fill in' : `${unfilled} values to fill in`}
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
    </section>
  );
}
