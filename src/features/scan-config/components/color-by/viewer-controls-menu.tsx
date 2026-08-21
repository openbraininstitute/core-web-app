import {
  RiCameraLine,
  RiCloseLine,
  RiEqualizerLine,
  RiFullscreenExitLine,
  RiFullscreenLine,
  RiMoonFill,
  RiMoonLine,
  RiRefreshLine,
  RiResetLeftLine,
  RiSunFill,
  RiSunLine,
} from '@remixicon/react';
import { Slider, Switch } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { AxonIcon } from '@/components/icons/Axon';
import { RulerMeasure } from '@/components/icons/RulerMeasure';
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
import { TooltipIcon } from '@/components/icons/Tooltip';
import { DEFAULT_ELECTRODE_RADIUS } from '@/features/scan-config/components/color-by/use-viewer-config';
import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export interface ViewerControlsMenuProps {
  onFullscreen: () => void;
  onResetView: () => void;
  /** capture a PNG of the circuit canvas (excludes gizmo, scalebar, chrome) */
  onCaptureImage: () => void;
  backgroundDark: boolean;
  onBackgroundDarkChange: (dark: boolean) => void;
  /** axons toggle — omit for viewers that have no axons (point cloud) */
  showAxons?: boolean;
  onToggleAxons?: (value: boolean) => void;
  /** neuron / soma opacity (0–1); omit to hide the control */
  neuronOpacity?: number;
  onNeuronOpacityChange?: (value: number) => void;
  /** electrode location overlays — omit when none are available */
  showElectrodes?: boolean;
  onToggleElectrodes?: (value: boolean) => void;
  /** electrode marker radius (world units); omit when electrodes unavailable */
  electrodeRadius?: number;
  onElectrodeRadiusChange?: (value: number) => void;
  /** morphology-location marker radius (world units); omit when picking is not active */
  morphologyLocationRadius?: number;
  onMorphologyLocationRadiusChange?: (value: number) => void;
  /** `Type[section]` tags beside each location; omit when picking is not active */
  showMorphologyLocationLabels?: boolean;
  onToggleMorphologyLocationLabels?: (value: boolean) => void;
  /** scalebar down the side of the canvas */
  showScalebar?: boolean;
  onToggleScalebar?: (value: boolean) => void;
  /** reset-config toggle is shown only when a saved config exists for this circuit */
  hasSavedConfig: boolean;
  onResetConfig: () => void;
  /** portal target for the popover (fullscreen element); null → document.body */
  container?: HTMLElement | null;
  isFullscreen?: boolean;
  className?: string;
}

/**
 * settings popover matching the mockup's left menu. the trigger is a gear that
 * turns into a close (✕) icon while the menu is open; the menu opens to the
 * right of the trigger
 */
export function ViewerControlsMenu({
  onFullscreen,
  onResetView,
  onCaptureImage,
  backgroundDark,
  onBackgroundDarkChange,
  showAxons,
  onToggleAxons,
  neuronOpacity,
  onNeuronOpacityChange,
  showElectrodes,
  onToggleElectrodes,
  electrodeRadius,
  morphologyLocationRadius,
  onMorphologyLocationRadiusChange,
  showMorphologyLocationLabels,
  onToggleMorphologyLocationLabels,
  showScalebar,
  onToggleScalebar,
  onElectrodeRadiusChange,
  hasSavedConfig,
  onResetConfig,
  container,
  isFullscreen = false,
  className,
}: ViewerControlsMenuProps) {
  const [open, setOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const settingsLabel = open ? 'Close settings' : 'Viewer settings';

  useEffect(() => {
    if (!open) return;
    // capture phase so a click on the WebGL canvas (which may stop propagation)
    // still closes the menu.
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (contentRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    return () => window.removeEventListener('pointerdown', onPointerDown, true);
  }, [open]);

  useEffect(() => {
    const onFullscreenChange = () => setOpen(false);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const handleFullscreen = () => {
    setOpen(false);
    onFullscreen();
  };

  const handleCaptureImage = () => {
    setOpen(false);
    onCaptureImage();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={open ? false : undefined}>
        <TooltipTrigger asChild>
          <PopoverTrigger
            ref={triggerRef}
            aria-label={settingsLabel}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full bg-white',
              'text-primary-9 shadow-md ring-1 ring-black/5 focus-visible:outline-none',
              'transition-colors hover:bg-neutral-100',
              className
            )}
          >
            {open ? (
              <RiCloseLine className="size-4 shrink-0" />
            ) : (
              <RiEqualizerLine className="size-4 shrink-0" />
            )}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          align="center"
          side="bottom"
          sideOffset={0}
          arrowClassName="bg-gray-200"
          className="text-primary-9 bg-gray-200"
        >
          {settingsLabel}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        container={container}
        side="right"
        align="start"
        sideOffset={8}
        className="w-56 rounded-xl border-neutral-200 bg-white p-1 shadow-xl"
      >
        <div ref={contentRef}>
          <MenuButton
            icon={
              isFullscreen ? (
                <RiFullscreenExitLine className="size-4 shrink-0" />
              ) : (
                <RiFullscreenLine className="size-4 shrink-0" />
              )
            }
            label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={handleFullscreen}
          />
          <MenuButton
            icon={<RiRefreshLine className="size-4 shrink-0" />}
            label="Reset view"
            onClick={onResetView}
          />
          <MenuButton
            icon={<RiCameraLine className="size-4 shrink-0" />}
            label="Capture image"
            onClick={handleCaptureImage}
          />
          {onToggleAxons && (
            <MenuRow label="Axons" icon={<AxonIcon className="size-4 shrink-0" />}>
              <ViewerSwitch checked={!!showAxons} onChange={onToggleAxons} />
            </MenuRow>
          )}
          {onToggleElectrodes && (
            <MenuRow label="Electrodes" icon={<ElectrodesIcon className="size-4 shrink-0" />}>
              <ViewerSwitch checked={!!showElectrodes} onChange={onToggleElectrodes} />
            </MenuRow>
          )}
          {onElectrodeRadiusChange && electrodeRadius !== undefined && showElectrodes !== false && (
            <MenuSlider
              label="Electrode size"
              min={DEFAULT_ELECTRODE_RADIUS}
              max={80}
              step={5}
              value={electrodeRadius}
              onChange={onElectrodeRadiusChange}
            />
          )}
          {onToggleScalebar && (
            <MenuRow label="Scale bar" icon={<RulerMeasure className="size-4 shrink-0" />}>
              <ViewerSwitch checked={!!showScalebar} onChange={onToggleScalebar} />
            </MenuRow>
          )}
          {onToggleMorphologyLocationLabels && (
            <MenuRow label="Location labels" icon={<TooltipIcon className="size-4 shrink-0" />}>
              <ViewerSwitch
                checked={!!showMorphologyLocationLabels}
                onChange={onToggleMorphologyLocationLabels}
              />
            </MenuRow>
          )}
          {onMorphologyLocationRadiusChange && morphologyLocationRadius !== undefined && (
            <MenuSlider
              label="Location marker size"
              min={1}
              max={30}
              step={1}
              value={morphologyLocationRadius}
              onChange={onMorphologyLocationRadiusChange}
            />
          )}
          {onNeuronOpacityChange && neuronOpacity !== undefined && (
            <MenuSlider
              label="Neuron opacity"
              min={5}
              max={100}
              step={5}
              value={Math.round(neuronOpacity * 100)}
              format={(percent) => `${percent}%`}
              onChange={(percent) => onNeuronOpacityChange(percent / 100)}
            />
          )}
          <MenuRow label="Background" icon={<SelectionBackground className="size-4 shrink-0" />}>
            <BackgroundToggle dark={backgroundDark} onChange={onBackgroundDarkChange} />
          </MenuRow>
          {hasSavedConfig && (
            <MenuButton
              icon={<RiResetLeftLine className="size-4 shrink-0" />}
              label="Reset saved view"
              onClick={onResetConfig}
            />
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function BackgroundToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-full bg-neutral-100 p-0.5">
      <BackgroundButton
        active={!dark}
        label="Light background"
        icon={
          dark ? (
            <RiSunLine className="size-4 shrink-0" />
          ) : (
            <RiSunFill className="size-4 shrink-0" />
          )
        }
        onClick={() => onChange(false)}
      />
      <BackgroundButton
        active={dark}
        label="Dark background"
        icon={
          dark ? (
            <RiMoonFill className="size-4 shrink-0" />
          ) : (
            <RiMoonLine className="size-4 shrink-0" />
          )
        }
        onClick={() => onChange(true)}
      />
    </div>
  );
}

function BackgroundButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none',
        active ? 'bg-primary-8 text-white' : 'text-neutral-500 hover:bg-white'
      )}
    >
      {icon}
    </button>
  );
}

/** icons inherit currentColor; parent row hover shifts them to primary-8 */
const menuItemIconClass =
  'inline-flex size-4 shrink-0 items-center justify-center text-neutral-700 transition-colors group-hover:text-primary-8';

function MenuButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100"
    >
      <span className={menuItemIconClass}>{icon}</span>
      {label}
    </button>
  );
}

/** A labelled slider row: {@link MenuRow} for controls that take a range. */
/**
 * Antd paints its own blue when a control is on; these bring it to primary-9 so the menu
 * matches the rest of the app. Applied per control rather than through a provider, which
 * would recolour every antd control on the page.
 */
const ON_COLOR = 'var(--color-primary-9)';

/** A settings switch, primary-9 while on. */
function ViewerSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      size="small"
      checked={checked}
      onChange={onChange}
      style={checked ? { backgroundColor: ON_COLOR } : undefined}
    />
  );
}

function MenuSlider({
  label,
  min,
  max,
  step,
  value,
  onChange,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
}) {
  return (
    <div className="group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
      <div className="flex items-center justify-between gap-2">
        <span>{label}</span>
        <span className="tabular-nums text-neutral-500">{format ? format(value) : value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        tooltip={{ formatter: null }}
        styles={{
          track: { backgroundColor: ON_COLOR },
          handle: { borderColor: ON_COLOR },
        }}
      />
    </div>
  );
}

function MenuRow({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
      <span className="flex items-center gap-2">
        {/* reserve the icon column so labels align with the icon'd menu buttons */}
        <span className={menuItemIconClass}>{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

function ElectrodesIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <title>Electrodes</title>
      <circle cx="4" cy="5" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="11" cy="11" r="1.5" />
    </svg>
  );
}
