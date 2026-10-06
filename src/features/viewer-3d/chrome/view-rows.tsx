import { RiCameraLensLine, RiLoopRightLine } from '@remixicon/react';

import { RulerMeasure } from '@/components/icons/RulerMeasure';
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
import { BackgroundToggle } from '@/features/scan-config/components/color-by/chrome-menu';

import { HelpRow, ICON, ToggleRow } from './menu-rows';

import type { Projection } from '../engine/scene-viewer';
import type { HelpText } from '../help/help-button';

interface ViewSettings {
  spin: boolean;
  projection: Projection;
  scalebar: boolean;
  dark: boolean;
}

/** The settings rows every viewer has: spin, projection, scale bar and background, with the viewer's own help. */
export function ViewRows({
  settings,
  update,
  help,
}: {
  settings: ViewSettings;
  update(patch: Partial<ViewSettings>): void;
  help: Record<'spin' | 'perspective' | 'scale-bar' | 'dark', HelpText>;
}) {
  return (
    <>
      <ToggleRow
        title="Spin"
        topic="spin"
        help={help.spin}
        icon={<RiLoopRightLine className={ICON} />}
        checked={settings.spin}
        onChange={(spin) => update({ spin })}
      />
      <ToggleRow
        title="Perspective"
        topic="perspective"
        help={help.perspective}
        icon={<RiCameraLensLine className={ICON} />}
        checked={settings.projection === 'perspective'}
        onChange={(on) => update({ projection: on ? 'perspective' : 'orthographic' })}
      />
      <ToggleRow
        title="Scale bar"
        topic="scale-bar"
        help={help['scale-bar']}
        icon={<RulerMeasure className={ICON} />}
        checked={settings.scalebar}
        onChange={(scalebar) => update({ scalebar })}
        disabled={settings.projection === 'perspective'}
      />
      <HelpRow
        title="Background"
        topic="dark"
        help={help.dark}
        icon={<SelectionBackground className={ICON} />}
      >
        <BackgroundToggle dark={settings.dark} onChange={(dark) => update({ dark })} />
      </HelpRow>
    </>
  );
}
