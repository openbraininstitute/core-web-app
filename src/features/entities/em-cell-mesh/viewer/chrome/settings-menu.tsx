import { RiContrast2Line, RiEqualizerLine } from '@remixicon/react';

import { ChromeMenu } from '@/features/scan-config/components/color-by/chrome-menu';
import { LookSelect } from '@/features/viewer-3d/chrome/look-select';
import { ViewRows } from '@/features/viewer-3d/chrome/view-rows';

import { HELP } from '../help/help-text';
import { Heading, ICON, ToggleRow } from './menu-rows';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { EmViewerSettings, UpdateEmSettings } from '../use-em-viewer-settings';

interface SettingsMenuProps {
  settings: EmViewerSettings;
  update: UpdateEmSettings;
  looks: Look[];
  look: Look;
  /** Choose a look, with the occlusion it comes with. */
  onLook(look: Look): void;
}

/** The circuit viewer's settings popover, with what the EM mesh viewer can change. */
export function SettingsMenu({ settings, update, looks, look, onLook }: SettingsMenuProps) {
  return (
    <ChromeMenu
      label="Viewer settings"
      testId="em-mesh-settings"
      icon={<RiEqualizerLine className={ICON} />}
      contentClassName="w-64 max-h-[min(36rem,calc(100vh-6rem))] overflow-y-auto"
    >
      <Heading>Look</Heading>
      <LookSelect
        looks={looks}
        look={look}
        onChange={onLook}
        help={HELP.look}
        testId="em-mesh-look"
      />
      <ToggleRow
        title="Ambient occlusion"
        topic="ao"
        icon={<RiContrast2Line className={ICON} />}
        checked={settings.ao}
        onChange={(ao) => update({ ao })}
      />

      <Heading>View</Heading>
      <ViewRows settings={settings} update={update} help={HELP} />
    </ChromeMenu>
  );
}
