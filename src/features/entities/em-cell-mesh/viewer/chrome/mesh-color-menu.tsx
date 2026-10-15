import { ColorPicker } from 'antd';

import { PillMenu } from '@/features/viewer-3d/chrome/pill-menu';
import { PillOption } from '@/features/viewer-3d/chrome/pill-option';
import { fullscreenPopupContainer } from '@/utils/fullscreen';

import { MESH_COLORS } from '../mesh-color';
import { HelpButton } from './menu-rows';

import type { ViewerTheme } from '@/features/scan-config/components/color-by/contrast';

/** Any colour: Custom's swatch until one is picked. */
const ANY = 'conic-gradient(#e5484d, #f5a524, #46a758, #12a594, #3e63dd, #8e4ec6, #e5484d)';

interface MeshColorMenuProps {
  value: string;
  onChange(value: string): void;
  dark: boolean;
  reason: string | null;
  theme: ViewerTheme;
}

/** "Colour ● Cobalt ▾": the mesh's colour, one of a few or any from the picker. */
export function MeshColorMenu({ value, onChange, dark, reason, theme }: MeshColorMenuProps) {
  const side = dark ? 'dark' : 'light';
  const preset = MESH_COLORS.find((c) => c.id === value);
  const color = preset ? preset.colors[side] : value;
  const label = preset?.label ?? 'Custom';

  return (
    <PillMenu
      title="Colour"
      value={label}
      swatch={color}
      testId="em-mesh-color"
      theme={theme}
      reason={reason}
      help={<HelpButton topic="color" title="Colour" />}
    >
      {(close) => (
        <ul>
          {MESH_COLORS.map((c) => (
            <PillOption
              key={c.id}
              label={c.label}
              swatch={c.colors[side]}
              selected={c.id === value}
              theme={theme}
              onClick={() => {
                onChange(c.id);
                close();
              }}
            />
          ))}
          <ColorPicker
            value={color}
            disabledAlpha
            placement="leftTop"
            arrow={false}
            getPopupContainer={fullscreenPopupContainer}
            onChange={(c) => {
              const hex = c.toHexString();
              // Dragged past its edge, the picker sends the colour it already has.
              if (hex !== value) onChange(hex);
            }}
          >
            <PillOption
              label="Custom"
              swatch={preset ? ANY : value}
              selected={!preset}
              theme={theme}
            />
          </ColorPicker>
        </ul>
      )}
    </PillMenu>
  );
}
