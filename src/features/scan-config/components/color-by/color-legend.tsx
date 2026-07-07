import { useVirtualizer } from '@tanstack/react-virtual';
import { ColorPicker } from 'antd';
import { useEffect, useState } from 'react';

import { cn } from '@/utils/css-class';

import { CATEGORICAL_PALETTE } from './palette';
import { type ColorMapping, ColorModeDict } from './types';

import type { ViewerTheme } from './contrast';

/**
 * in-house flag for manual color editing. When off, swatches are plain (read-only)
 * dots. Editing is not always required, so it lives behind this flag.
 */
const COLOR_EDITING_ENABLED = true;

const PRESETS = [{ label: 'Palette', colors: [...CATEGORICAL_PALETTE] }];

interface ColorLegendProps {
  mapping: ColorMapping;
  /** override the color of a single categorical value. */
  onChangeCategoryColor: (value: string, color: string) => void;
  /** enable clicking a swatch to pick a custom color. defaults to the flag. */
  editable?: boolean;
  /** background-derived theme (adaptive mode); null → fixed light styling. */
  theme?: ViewerTheme | null;
  className?: string;
}

/**
 * color key for the current property: a scrollable categorical list or a
 * continuous scale bar. Rendered as a floating glass panel over the (blurred) 3D
 * view. always expanded
 */
export function ColorLegend({
  mapping,
  onChangeCategoryColor,
  editable = COLOR_EDITING_ENABLED,
  theme,
  className,
}: ColorLegendProps) {
  // which swatch's picker is open (controlled, so we can close on outside click).
  const [openValue, setOpenValue] = useState<string | null>(null);

  useEffect(() => {
    if (!openValue) return;
    // capture phase so a click on the WebGL canvas (which may stop propagation)
    // still closes the picker.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element | null;
      if (target?.closest('.ant-color-picker') || target?.closest('[data-swatch-trigger]')) return;
      setOpenValue(null);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [openValue]);

  if (mapping.mode === ColorModeDict.None || !mapping.property) return null;

  const panelStyle = theme
    ? {
        background: theme.panelBackground,
        color: theme.foreground,
        boxShadow: `0 0 0 1px ${theme.panelRing}`,
      }
    : undefined;

  return (
    <div
      id="color-mapping-panel"
      data-testid="color-mapping-panel"
      className={cn(
        'min-w-0 max-w-full rounded-xl p-2 pr-0.5 text-xs backdrop-blur-3xl',
        !theme && 'ring-1 ring-gray-50 bg-white/5',
        className
      )}
      style={panelStyle}
    >
      {mapping.mode === ColorModeDict.Categorical && mapping.categorical && (
        <CategoricalList
          entries={mapping.categorical}
          editable={editable}
          theme={theme}
          openValue={openValue}
          setOpenValue={setOpenValue}
          onChangeCategoryColor={onChangeCategoryColor}
        />
      )}
      {mapping.mode === ColorModeDict.Continuous && mapping.continuous && (
        <ContinuousScale continuous={mapping.continuous} theme={theme} />
      )}
    </div>
  );
}

/**
 * virtualized categorical key: only the visible rows are in the DOM, so a
 * high-cardinality property (thousands of distinct values) renders instantly
 * instead of freezing the tab. antd ColorPicker is mounted only for
 * the row whose picker is open; every other row is a plain button
 */
function CategoricalList({
  entries,
  editable,
  theme,
  openValue,
  setOpenValue,
  onChangeCategoryColor,
}: {
  entries: NonNullable<ColorMapping['categorical']>;
  editable: boolean;
  theme?: ViewerTheme | null;
  openValue: string | null;
  setOpenValue: (value: string | null) => void;
  onChangeCategoryColor: (value: string, color: string) => void;
}) {
  const [parent, setParent] = useState<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: entries.length,
    enabled: entries.length > 0 && !!parent,
    getScrollElement: () => parent,
    estimateSize: () => 26,
    overscan: 8,
  });

  return (
    <div
      id="color-mapping-list"
      data-testid="color-mapping-list"
      ref={setParent}
      className="max-h-56 min-w-0 overflow-y-auto secondary-scrollbar pr-1.5"
    >
      <div style={{ height: virtualizer.getTotalSize(), width: '100%', position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const entry = entries[virtualItem.index];
          if (!entry) return null;

          const open = openValue === entry.value;
          const swatch = (
            <button
              type="button"
              data-swatch-trigger
              aria-label={`Change color for ${entry.value}`}
              className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ backgroundColor: entry.color }}
              onClick={editable && !open ? () => setOpenValue(entry.value) : undefined}
            />
          );

          return (
            <div
              key={entry.value}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className="flex min-w-0 items-center justify-between gap-2 py-0.5"
            >
              <span
                className={cn('min-w-0 flex-1 truncate', !theme && 'text-neutral-700')}
                title={entry.value}
              >
                {entry.value}
              </span>
              {editable && open ? (
                <ColorPicker
                  value={entry.color}
                  size="small"
                  placement="bottomRight"
                  arrow={false}
                  presets={PRESETS}
                  open
                  onOpenChange={(o) => setOpenValue(o ? entry.value : null)}
                  onChangeComplete={(c) => onChangeCategoryColor(entry.value, c.toHexString())}
                >
                  {swatch}
                </ColorPicker>
              ) : (
                swatch
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ContinuousScale({
  continuous,
  theme,
}: {
  continuous: NonNullable<ColorMapping['continuous']>;
  theme?: ViewerTheme | null;
}) {
  const { min, max, gradient } = continuous;
  return (
    <div className="flex items-stretch gap-2 px-1 pb-1">
      <div
        className="h-40 w-3 shrink-0 rounded"
        style={{
          background: `linear-gradient(to top, ${gradient.join(', ')})`,
        }}
      />
      <div
        className={cn('flex flex-col justify-between tabular-nums', !theme && 'text-neutral-600')}
      >
        <span>{formatBound(max)}</span>
        <span>{formatBound((min + max) / 2)}</span>
        <span>{formatBound(min)}</span>
      </div>
    </div>
  );
}

function formatBound(value: number): string {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1000 || (value !== 0 && Math.abs(value) < 0.01)) {
    return value.toExponential(1);
  }
  return Number.parseFloat(value.toFixed(2)).toString();
}
