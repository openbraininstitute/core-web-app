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
import { SelectionBackground } from '@/components/icons/SelectionBackgroundThin';
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
              <Switch size="small" checked={!!showAxons} onChange={onToggleAxons} />
            </MenuRow>
          )}
          {onToggleElectrodes && (
            <MenuRow label="Electrodes" icon={<ElectrodesIcon className="size-4 shrink-0" />}>
              <Switch size="small" checked={!!showElectrodes} onChange={onToggleElectrodes} />
            </MenuRow>
          )}
          {onElectrodeRadiusChange && electrodeRadius !== undefined && showElectrodes !== false && (
            <div className="group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
              <div className="flex items-center justify-between gap-2">
                <span>Electrode size</span>
                <span className="tabular-nums text-neutral-500">{electrodeRadius}</span>
              </div>
              <Slider
                min={DEFAULT_ELECTRODE_RADIUS}
                max={80}
                step={5}
                value={electrodeRadius}
                onChange={onElectrodeRadiusChange}
                tooltip={{ formatter: null }}
                disabled={showElectrodes === false}
              />
            </div>
          )}
          {onToggleMorphologyLocationLabels && (
            <MenuRow label="Location labels">
              <Switch
                size="small"
                checked={!!showMorphologyLocationLabels}
                onChange={onToggleMorphologyLocationLabels}
              />
            </MenuRow>
          )}
          {onMorphologyLocationRadiusChange && morphologyLocationRadius !== undefined && (
            <div className="group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
              <div className="flex items-center justify-between gap-2">
                <span>Location marker size</span>
                <span className="tabular-nums text-neutral-500">{morphologyLocationRadius}</span>
              </div>
              <Slider
                min={1}
                max={30}
                step={1}
                value={morphologyLocationRadius}
                onChange={onMorphologyLocationRadiusChange}
                tooltip={{ formatter: null }}
              />
            </div>
          )}
          {onNeuronOpacityChange && neuronOpacity !== undefined && (
            <div className="group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100">
              <div className="flex items-center justify-between gap-2">
                <span>Neuron opacity</span>
                <span className="tabular-nums text-neutral-500">
                  {Math.round(neuronOpacity * 100)}%
                </span>
              </div>
              <Slider
                min={5}
                max={100}
                step={5}
                value={Math.round(neuronOpacity * 100)}
                onChange={(pct) => onNeuronOpacityChange(pct / 100)}
                tooltip={{ formatter: null }}
              />
            </div>
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
