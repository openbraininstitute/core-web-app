import {
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
import { Switch } from 'antd';
import { useEffect, useRef, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export interface ViewerControlsMenuProps {
  onFullscreen: () => void;
  onResetView: () => void;
  backgroundDark: boolean;
  onBackgroundDarkChange: (dark: boolean) => void;
  /** axons toggle — omit for viewers that have no axons (point cloud) */
  showAxons?: boolean;
  onToggleAxons?: (value: boolean) => void;
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
  backgroundDark,
  onBackgroundDarkChange,
  showAxons,
  onToggleAxons,
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
            {open ? <RiCloseLine className="size-4" /> : <RiEqualizerLine className="size-4" />}
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
                <RiFullscreenExitLine className="size-4" />
              ) : (
                <RiFullscreenLine className="size-4" />
              )
            }
            label={isFullscreen ? 'Exit full screen' : 'Full screen'}
            onClick={handleFullscreen}
          />
          <MenuButton
            icon={<RiRefreshLine className="size-4" />}
            label="Reset view"
            onClick={onResetView}
          />
          {onToggleAxons && (
            <MenuRow label="Axons">
              <Switch size="small" checked={!!showAxons} onChange={onToggleAxons} />
            </MenuRow>
          )}
          <MenuRow label="Background">
            <BackgroundToggle dark={backgroundDark} onChange={onBackgroundDarkChange} />
          </MenuRow>
          {hasSavedConfig && (
            <MenuButton
              icon={<RiResetLeftLine className="size-4" />}
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
        icon={dark ? <RiSunLine className="size-4" /> : <RiSunFill className="size-4" />}
        onClick={() => onChange(false)}
      />
      <BackgroundButton
        active={dark}
        label="Dark background"
        icon={dark ? <RiMoonFill className="size-4" /> : <RiMoonLine className="size-4" />}
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
      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100"
    >
      {icon}
      {label}
    </button>
  );
}

function MenuRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700">
      <span>{label}</span>
      {children}
    </div>
  );
}
