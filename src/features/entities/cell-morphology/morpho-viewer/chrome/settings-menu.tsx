import {
  RiBubbleChartLine,
  RiCameraLensLine,
  RiContrast2Line,
  RiDropLine,
  RiEqualizerLine,
  RiGridLine,
  RiLoopRightLine,
  RiNodeTree,
  RiShapeLine,
} from '@remixicon/react';

import { RulerMeasure } from '@/components/icons/RulerMeasure';
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
import {
  BackgroundToggle,
  ChromeMenu,
  SegmentedToggle,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { LookSelect } from '@/features/viewer-3d/chrome/look-select';

import { MIN_WIDTH } from '../constants';
import { HELP } from '../help/help-text';
import { Heading, HelpRow, ICON, SliderRow, ToggleRow } from './menu-rows';

import type { Look } from '@/features/viewer-3d/engine/looks';
import type { SkeletonKind } from '../engine/viewer';
import type { UpdateSettings, ViewerSettings } from '../use-viewer-settings';

interface SettingsMenuProps {
  settings: ViewerSettings;
  update: UpdateSettings;
  looks: Look[];
  look: Look;
  /** Choose a look, with the bumps and occlusion it comes with. */
  onLook(look: Look): void;
  /** The skeleton choice takes over from the traced skeleton once there is a mesh. */
  hasMesh: boolean;
}

/** The circuit viewer's settings popover, with what the morphology viewer can change. */
export function SettingsMenu({
  settings,
  update,
  looks,
  look,
  onLook,
  hasMesh,
}: SettingsMenuProps) {
  return (
    <ChromeMenu
      label="Viewer settings"
      testId="morphology-settings"
      icon={<RiEqualizerLine className={ICON} />}
      contentClassName="w-64 max-h-[min(36rem,calc(100vh-6rem))] overflow-y-auto"
    >
      <Heading>Look</Heading>
      <LookSelect
        looks={looks}
        look={look}
        onChange={onLook}
        help={HELP.look}
        testId="morphology-look"
      />
      {look.colors === 'tint' && (
        <ToggleRow
          title="Type tint"
          topic="type-tint"
          icon={<RiDropLine className={ICON} />}
          checked={settings.typeTint}
          onChange={(typeTint) => update({ typeTint })}
        />
      )}
      <ToggleRow
        title="Ambient occlusion"
        topic="ao"
        icon={<RiContrast2Line className={ICON} />}
        checked={settings.ao}
        onChange={(ao) => update({ ao })}
      />
      <ToggleRow
        title="Bumps"
        topic="bumps"
        icon={<RiBubbleChartLine className={ICON} />}
        checked={settings.bumps}
        onChange={(bumps) => update({ bumps })}
      />

      <Heading>View</Heading>
      <ToggleRow
        title="Mesh"
        topic="show-mesh"
        icon={<RiShapeLine className={ICON} />}
        checked={settings.showMesh}
        onChange={(showMesh) => update({ showMesh })}
      />
      <ToggleRow
        title="Wireframe"
        topic="wireframe"
        icon={<RiGridLine className={ICON} />}
        checked={settings.wireframe}
        onChange={(wireframe) => update({ wireframe })}
      />
      <HelpRow
        title="Skeleton"
        topic="skeleton"
        icon={<RiNodeTree className={ICON} />}
        disabled={!hasMesh}
        className="flex-wrap"
      >
        <SegmentedToggle<SkeletonKind | 'off'>
          value={hasMesh ? (settings.skeleton ?? 'off') : 'original'}
          onChange={(v) => update({ skeleton: v === 'off' ? null : v })}
          disabled={!hasMesh}
          options={[
            { value: 'off', label: 'No skeleton', text: 'Off' },
            { value: 'original', label: 'Traced skeleton', text: 'Traced' },
            { value: 'processed', label: 'Processed skeleton', text: 'Processed' },
          ]}
        />
      </HelpRow>
      <SliderRow
        title="Min. width"
        topic="min-width"
        min={MIN_WIDTH.min}
        max={MIN_WIDTH.max}
        step={MIN_WIDTH.step}
        value={settings.minWidth}
        onChange={(minWidth) => update({ minWidth })}
        format={(v) => (v === 0 ? 'off' : `${v.toFixed(1)} px`)}
      />
      <ToggleRow
        title="Spin"
        topic="spin"
        icon={<RiLoopRightLine className={ICON} />}
        checked={settings.spin}
        onChange={(spin) => update({ spin })}
      />
      <ToggleRow
        title="Perspective"
        topic="perspective"
        icon={<RiCameraLensLine className={ICON} />}
        checked={settings.projection === 'perspective'}
        onChange={(on) => update({ projection: on ? 'perspective' : 'orthographic' })}
      />
      <ToggleRow
        title="Scale bar"
        topic="scale-bar"
        icon={<RulerMeasure className={ICON} />}
        checked={settings.scalebar}
        onChange={(scalebar) => update({ scalebar })}
        disabled={settings.projection === 'perspective'}
      />
      <HelpRow title="Background" topic="dark" icon={<SelectionBackground className={ICON} />}>
        <BackgroundToggle dark={settings.dark} onChange={(dark) => update({ dark })} />
      </HelpRow>
    </ChromeMenu>
  );
}
