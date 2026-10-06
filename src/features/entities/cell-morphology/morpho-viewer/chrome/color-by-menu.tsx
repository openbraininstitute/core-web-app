import { PillMenu } from '@/features/viewer-3d/chrome/pill-menu';
import { PillOption } from '@/features/viewer-3d/chrome/pill-option';

import { HelpButton } from './menu-rows';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';
import type { ColorBy } from '../use-viewer-settings';

const OPTIONS: { value: ColorBy; label: string; detail: string }[] = [
  { value: 'section', label: 'Section', detail: 'Each neurite type in its own colour' },
  { value: 'distance', label: 'Distance', detail: 'Path distance from the soma' },
];

interface ColorByMenuProps {
  value: ColorBy;
  onChange(value: ColorBy): void;
  theme: ViewerTheme;
  /** Why the neurite colours have no effect in the current look, where they have none. */
  reason: string | null;
}

/** "Colour by Section ▾", as the circuit viewer's pill. */
export function ColorByMenu({ value, onChange, theme, reason }: ColorByMenuProps) {
  const label = OPTIONS.find((o) => o.value === value)?.label ?? value;

  return (
    <PillMenu
      title="Colour by"
      value={label}
      testId="morphology-color-by"
      theme={theme}
      reason={reason}
      help={<HelpButton topic="color-by" title="Colour by" />}
    >
      {(close) => (
        <ul>
          {OPTIONS.map((o) => (
            <PillOption
              key={o.value}
              label={o.label}
              detail={o.detail}
              selected={o.value === value}
              theme={theme}
              onClick={() => {
                onChange(o.value);
                close();
              }}
            />
          ))}
        </ul>
      )}
    </PillMenu>
  );
}
