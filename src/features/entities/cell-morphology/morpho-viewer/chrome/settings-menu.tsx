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
  MenuRow,
  MenuSlider,
  SegmentedToggle,
  ViewerSwitch,
} from '@/features/scan-config/components/color-by/chrome-menu';
import { viewerTheme } from '@/features/scan-config/components/color-by/contrast';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';

import { MIN_WIDTH } from '../constants';
import { MAX_BUMP_AMPLITUDE } from '../engine/looks';
import { besideRow, type Placement } from '../help/beside-row';
import { HelpButton } from '../help/help-button';
import { focusChosen, PillOption } from './pill-option';

import type { ReactNode } from 'react';
import type { Look } from '../engine/looks';
import type { SkeletonKind } from '../engine/viewer';
import type { HelpKey } from '../help/help-text';
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

const ICON = 'size-4 shrink-0';
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
  const { bump } = settings;
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
      {settings.bumps && (
        <>
          <SliderRow
            title="Bump height"
            topic="bump-amp"
            min={0}
            max={MAX_BUMP_AMPLITUDE}
            step={0.005}
            value={bump.amplitude}
            onChange={(amplitude) => update({ bump: { ...bump, amplitude } })}
            format={(v) => `${v.toFixed(3)} × r`}
          />
          <SliderRow
            title="Bump scale"
            topic="bump-scale"
            min={0.5}
            max={5}
            step={0.1}
            value={bump.scale}
            onChange={(scale) => update({ bump: { ...bump, scale } })}
            format={(v) => `${v.toFixed(1)} µm`}
          />
          <SliderRow
            title="Bump smoothness"
            topic="bump-smooth"
            min={0}
            max={1}
            step={0.05}
            value={bump.smoothness}
            onChange={(smoothness) => update({ bump: { ...bump, smoothness } })}
            format={(v) => v.toFixed(2)}
          />
        </>
      )}

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

function Heading({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pt-2 pb-1 text-xs uppercase tracking-wide text-neutral-400">
      {children}
    </div>
  );
}

function Label({ title, topic }: { title: string; topic: HelpKey }) {
  return (
    <span className="flex items-center">
      {title}
      <HelpButton topic={topic} title={title} />
    </span>
  );
}

/** A row whose label has a "?", the card of which comes up beside the row. */
function HelpRow({
  title,
  topic,
  icon,
  disabled,
  className,
  children,
}: {
  title: string;
  topic: HelpKey;
  icon: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div data-help-anchor>
      <MenuRow
        label={<Label title={title} topic={topic} />}
        icon={icon}
        disabled={disabled}
        className={className}
      >
        {children}
      </MenuRow>
    </div>
  );
}

function ToggleRow({
  title,
  topic,
  icon,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  topic: HelpKey;
  icon: ReactNode;
  checked: boolean;
  onChange(value: boolean): void;
  disabled?: boolean;
}) {
  return (
    <HelpRow title={title} topic={topic} icon={icon} disabled={disabled}>
      <ViewerSwitch checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </HelpRow>
  );
}

function SliderRow({
  title,
  topic,
  ...slider
}: {
  title: string;
  topic: HelpKey;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange(value: number): void;
  format(value: number): string;
}) {
  return (
    <div data-help-anchor>
      <MenuSlider label={<Label title={title} topic={topic} />} {...slider} />
    </div>
  );
}
