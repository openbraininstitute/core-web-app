import {
  RiArrowRightSLine,
  RiBubbleChartLine,
  RiCameraLensLine,
  RiContrast2Line,
  RiContrastDrop2Line,
  RiDropLine,
  RiEqualizerLine,
  RiGridLine,
  RiLoopRightLine,
  RiNodeTree,
  RiShapeLine,
} from '@remixicon/react';
import { useRef, useState } from 'react';

import { RulerMeasure } from '@/components/icons/RulerMeasure';
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
import {
  BackgroundToggle,
  ChromeMenu,
  SegmentedToggle,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

import { MIN_WIDTH } from '../constants';
import { besideRow, type Placement } from '../help/beside-row';
import { Heading, HelpRow, ICON, SliderRow, ToggleRow } from './menu-rows';
import { focusChosen, PillOption } from './pill-option';

import type { Look } from '../engine/looks';
import type { SkeletonKind } from '../engine/viewer';
import type { UpdateSettings, ViewerSettings } from '../use-viewer-settings';

interface SettingsMenuProps {
  settings: ViewerSettings;
  update: UpdateSettings;
  looks: Look[];
  look: Look;
  /** Choose a look, with the bumps and occlusion it comes with. */
  onLook(id: string): void;
  /** The skeleton choice takes over from the traced skeleton once there is a mesh. */
  hasMesh: boolean;
}

const LIGHT = viewerTheme(false);
/** The look list's width (`w-72`), px. */
const LOOKS_WIDTH = 288;

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
      <LookSelect looks={looks} look={look} onChange={onLook} />
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

/** The look, from a list beside the menu that gives the line describing each. */
function LookSelect({
  looks,
  look,
  onChange,
}: {
  looks: Look[];
  look: Look;
  onChange(id: string): void;
}) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<Placement>({ side: 'right', sideOffset: 0, alignOffset: 0 });
  const trigger = useRef<HTMLButtonElement>(null);

  return (
    <HelpRow title="Look" topic="look" icon={<RiContrastDrop2Line className={ICON} />}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          if (next && trigger.current) setPlace(besideRow(trigger.current, LOOKS_WIDTH));
          setOpen(next);
        }}
      >
        <PopoverTrigger
          ref={trigger}
          data-testid="morphology-look"
          aria-label={`Look: ${look.label}`}
          className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 py-1 pr-1 pl-2.5 text-xs font-medium text-primary-9 transition-colors hover:bg-neutral-200"
        >
          {look.label}
          <RiArrowRightSLine className="size-4" />
        </PopoverTrigger>
        <PopoverContent
          {...place}
          align="start"
          collisionPadding={8}
          className="w-72 rounded-xl border-neutral-200 bg-white p-1 text-neutral-700 shadow-xl"
          onOpenAutoFocus={focusChosen}
        >
          <ul className="max-h-[min(30rem,calc(100vh-6rem))] overflow-y-auto" aria-label="Looks">
            {looks.map((l) => (
              <PillOption
                key={l.id}
                label={l.label}
                detail={l.hint}
                selected={l.id === look.id}
                theme={LIGHT}
                onClick={() => {
                  onChange(l.id);
                  setOpen(false);
                }}
              />
            ))}
          </ul>
        </PopoverContent>
      </Popover>
    </HelpRow>
  );
}
