import { RiEyeLine, RiEyeOffLine, RiResetLeftLine } from '@remixicon/react';
import { ColorPicker } from 'antd';
import { useState } from 'react';

import { useChromeDismiss } from '@/features/scan-config/components/color-by/chrome-menu';
import { mutedStyle, panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { ColorDot } from '@/features/viewer-3d/chrome/color-dot';
import { cn } from '@/utils/css-class';
import { fullscreenPopupContainer } from '@/utils/fullscreen';

import { DISTANCE_RAMP, PALETTE_KEYS } from '../engine/colors';
import { SWC_APICAL, SWC_AXON, SWC_BASAL, SWC_SOMA } from '../engine/swc';
import { currentPalette, type ViewerSettings } from '../use-viewer-settings';
import { HelpButton } from './menu-rows';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { Look, LookLegend } from '@/features/viewer-3d/engine/looks';
import type { ViewerActions } from '../use-viewer-settings';

const ROWS = [
  { type: SWC_SOMA, label: 'Soma' },
  { type: SWC_BASAL, label: 'Basal dendrite' },
  { type: SWC_APICAL, label: 'Apical dendrite' },
  { type: SWC_AXON, label: 'Axon' },
];

const ICON_BUTTON =
  'inline-flex size-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-current/10 focus-visible:outline-none disabled:opacity-40';

interface NeuritesKeyProps {
  settings: ViewerSettings;
  actions: ViewerActions;
  /** The SWC types in the file. */
  types: ReadonlySet<number>;
  look: Look;
  theme: ViewerTheme;
  /** Why the neurite colours have no effect in the current look, where they have none. */
  reason: string | null;
  /** The farthest path distance from the soma, µm, once it is known. */
  maxDistance: number | null;
  /** Why the path distances could not be measured. */
  distanceError: string | null;
}

/**
 * The key under "Colour by": each neurite type with its colour, which a click on the swatch
 * changes, and an eye that leaves the type out; the distance ramp; and the key to a look's own
 * colours. The circuit viewer's legend and synapse card, in one.
 */
export function NeuritesKey({
  settings,
  actions,
  types,
  look,
  theme,
  reason,
  maxDistance,
  distanceError,
}: NeuritesKeyProps) {
  const palette = currentPalette(settings);
  const hidden = new Set(settings.hiddenTypes);
  const colorsApply = reason === null;
  const bySection = colorsApply && settings.colorBy === 'section';
  // Without both kinds of dendrite, the one there is is just "Dendrite".
  const bothDendrites = types.has(SWC_BASAL) && types.has(SWC_APICAL);
  const toggle = (type: number) =>
    actions.update({
      hiddenTypes: hidden.has(type)
        ? settings.hiddenTypes.filter((t) => t !== type)
        : [...settings.hiddenTypes, type],
    });

  return (
    <aside
      aria-label="Neurite colours"
      data-testid="neurites-key"
      className="flex w-56 flex-col gap-2 rounded-xl p-2.5 text-xs backdrop-blur-3xl"
      style={panelStyle(theme)}
    >
      {look.legend && <LookKey title={look.label} legend={look.legend} theme={theme} />}
      {colorsApply && settings.colorBy === 'distance' && maxDistance !== null && (
        <DistanceScale max={maxDistance} theme={theme} />
      )}
      {colorsApply && settings.colorBy === 'distance' && distanceError && (
        <p role="alert" className="m-0 leading-snug">
          The path distances could not be measured: {distanceError}
        </p>
      )}
      <div className="flex items-center" data-help-anchor>
        <span className="font-medium">Neurites</span>
        <HelpButton topic="colors" title="Neurites" />
      </div>
      <ul className="flex flex-col gap-0.5">
        {ROWS.filter((r) => types.has(r.type)).map((r) => {
          const isHidden = hidden.has(r.type);
          const key = PALETTE_KEYS[r.type];
          const label =
            !bothDendrites && (r.type === SWC_BASAL || r.type === SWC_APICAL)
              ? 'Dendrite'
              : r.label;
          const EyeIcon = isHidden ? RiEyeOffLine : RiEyeLine;
          return (
            <li key={r.type} className="flex min-h-6 items-center gap-2">
              {bySection ? (
                <Swatch
                  label={label}
                  color={palette[key]}
                  faded={isHidden}
                  onChange={(color) => actions.setColor(key, color)}
                />
              ) : (
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-current opacity-25"
                />
              )}
              <span className={cn('mr-auto font-medium', isHidden && 'opacity-50')}>{label}</span>
              {r.type !== SWC_SOMA && (
                <button
                  type="button"
                  aria-label={`${isHidden ? 'Show' : 'Hide'} ${label.toLowerCase()}`}
                  aria-pressed={isHidden}
                  onClick={() => toggle(r.type)}
                  className={ICON_BUTTON}
                >
                  <EyeIcon className="size-3.5" />
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {reason && (
        <p className="m-0 italic leading-snug" style={mutedStyle(theme)}>
          {reason}
        </p>
      )}
      <div className="flex items-center" data-help-anchor>
        <button
          type="button"
          onClick={actions.resetColors}
          disabled={!colorsApply}
          className="inline-flex items-center gap-1 font-medium enabled:hover:underline disabled:opacity-40"
        >
          <RiResetLeftLine className="size-3.5" />
          Reset colours
        </button>
        <HelpButton topic="reset-colors" title="Reset colours" />
      </div>
    </aside>
  );
}

/** A round swatch that opens the circuit legend's colour picker. */
function Swatch({
  label,
  color,
  faded,
  onChange,
}: {
  label: string;
  color: string;
  faded: boolean;
  onChange(color: string): void;
}) {
  const [open, setOpen] = useState(false);
  // antd closes the picker on any other press outside it.
  useChromeDismiss(open, () => setOpen(false));

  // Mounted while closed too: a button swapped for the picker's would lose the keyboard focus.
  return (
    <ColorPicker
      value={color}
      size="small"
      placement="bottomLeft"
      arrow={false}
      disabledAlpha
      open={open}
      getPopupContainer={fullscreenPopupContainer}
      onOpenChange={setOpen}
      onChange={(c) => onChange(c.toHexString())}
    >
      <button
        type="button"
        aria-label={`Change the colour of the ${label.toLowerCase()}`}
        className={cn('size-3 shrink-0 rounded-full ring-1 ring-black/10', faded && 'opacity-40')}
        style={{ backgroundColor: color }}
      />
    </ColorPicker>
  );
}

/** Path distance to the soma, as the circuit legend's continuous scale: 0 at the bottom. */
function DistanceScale({ max, theme }: { max: number; theme: ViewerTheme }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">Path distance to soma</span>
      <Ramp
        stops={[...DISTANCE_RAMP].reverse()}
        labels={[`${max.toFixed(0)} µm`, `${(max / 2).toFixed(0)} µm`, '0 µm']}
        theme={theme}
      />
    </div>
  );
}

/** A colour ramp down the card, with its labels spread along it; both from the top. */
function Ramp({ stops, labels, theme }: { stops: string[]; labels: string[]; theme: ViewerTheme }) {
  return (
    <div className="flex items-stretch gap-2 px-1">
      <div
        className="h-28 w-3 shrink-0 rounded"
        style={{ background: `linear-gradient(to bottom, ${stops.join(', ')})` }}
      />
      <div className="flex flex-col justify-between tabular-nums" style={mutedStyle(theme)}>
        {labels.map((label, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: the labels keep their places, and may repeat (0 µm)
          <span key={i}>{label}</span>
        ))}
      </div>
    </div>
  );
}

/** What the look's own colours mean: the neurite colours have no effect in it. */
function LookKey({
  title,
  legend,
  theme,
}: {
  title: string;
  legend: LookLegend;
  theme: ViewerTheme;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center" data-help-anchor>
        <span className="font-medium">{title}</span>
        <HelpButton topic="look-key" title={title} />
      </div>
      {legend.kind === 'swatches' ? (
        <ul className="flex flex-col gap-0.5">
          {legend.items.map((item) => (
            <li key={item.label} className="flex min-h-6 items-center gap-2">
              <ColorDot color={item.color} />
              <span className="font-medium">{item.label}</span>
            </li>
          ))}
        </ul>
      ) : (
        <Ramp stops={legend.stops} labels={[legend.from, legend.to]} theme={theme} />
      )}
    </div>
  );
}
