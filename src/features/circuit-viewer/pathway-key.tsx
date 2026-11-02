import { pathwayColors } from '@/features/circuit-viewer/pathway-colors';
import { mutedStyle, panelStyle } from '@/features/scan-config/components/color-by/contrast';
import { fadedNeuronColor } from '@/features/scan-config/components/color-by/palette';
import { cn } from '@/utils/css-class';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

/**
 * What a matrix cell under the pointer colours in the scene: its row's neurons, its column's,
 * a neuron in both, and the rest. A glass panel like the colour-by key, labelled in the
 * panel's text colours.
 */
export function PathwayKey({
  background,
  theme,
}: {
  /** The canvas, which the colours are stepped for. */
  background: string;
  theme?: ViewerTheme | null;
}) {
  const colors = pathwayColors(background);
  const entries = [
    { label: 'Presynaptic (row)', color: colors.start },
    { label: 'Postsynaptic (column)', color: colors.end },
    // A group's neurons are in both only where it connects to itself.
    { label: 'Both (on the diagonal)', color: colors.both },
    { label: 'Other neurons', color: fadedNeuronColor(background) },
  ];
  return (
    <div
      data-testid="pathway-key"
      className={cn(
        'rounded-xl px-3 py-2 text-xs backdrop-blur-3xl',
        !theme && 'bg-white/5 ring-1 ring-gray-50'
      )}
      style={theme ? panelStyle(theme) : undefined}
    >
      <p
        className={cn('mb-1.5', !theme && 'text-neutral-500')}
        style={theme ? mutedStyle(theme) : undefined}
      >
        Hover a matrix cell to show its pathway
      </p>
      <ul className="flex flex-col gap-1">
        {entries.map(({ label, color }) => (
          <li key={label} className={cn('flex items-center gap-2', !theme && 'text-neutral-700')}>
            <span
              aria-hidden
              className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
              style={{ background: color }}
            />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
