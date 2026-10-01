import { RiCloseLine, RiMoonFill, RiMoonLine, RiSunFill, RiSunLine } from '@remixicon/react';
import { Slider, Switch } from 'antd';
import { type ReactNode, useCallback, useEffect, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/ui/molecules/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

/**
 * A viewer's settings popover: a round trigger that turns into a close (✕) icon while
 * the menu is open, and a menu that opens to the right of it. Shared by the circuit and
 * the morphology viewers, so their settings look and behave alike.
 */
export function ChromeMenu({
  label,
  openLabel = 'Close settings',
  icon,
  testId,
  className,
  contentClassName,
  children,
}: {
  /** Tooltip and accessible name while closed. */
  label: string;
  /** The same while open. */
  openLabel?: string;
  icon: ReactNode;
  testId?: string;
  className?: string;
  contentClassName?: string;
  /** The rows, or a function of the way to close the menu, for rows that act and are done. */
  children: ReactNode | ((close: () => void) => ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const [tip, setTip] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const triggerLabel = open ? openLabel : label;
  useChromeDismiss(open, close);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip open={tip && !open} onOpenChange={setTip}>
        <TooltipTrigger asChild>
          <PopoverTrigger
            data-testid={testId}
            aria-label={triggerLabel}
            className={cn(
              'inline-flex size-8 items-center justify-center rounded-full bg-white',
              'text-primary-9 shadow-md ring-1 ring-black/5 focus-visible:outline-none',
              'transition-colors hover:bg-neutral-100',
              className
            )}
          >
            {open ? <RiCloseLine className="size-4 shrink-0" /> : icon}
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent
          align="center"
          side="bottom"
          sideOffset={0}
          arrowClassName="bg-gray-200"
          className="text-primary-9 bg-gray-200"
        >
          {triggerLabel}
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        // The menu itself takes the focus, where its first row could be a "?" whose card would come up with it.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
        // A drag that misses a slider's handle would otherwise select the page up to the pointer.
        className={cn(
          'w-56 rounded-xl border-neutral-200 bg-white p-1 shadow-xl select-none',
          contentClassName
        )}
      >
        <div>{typeof children === 'function' ? children(close) : children}</div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Close a viewer's popover on what Radix does not see: a press that never reaches the document, stopped on the way by
 * a canvas's controls (tgd's) or a React handler; a press on a canvas, which antd's pickers miss when its pointer down
 * was cancelled; and a fullscreen change. Radix closes it on any other press outside. A press in a popover is left to
 * Radix, for which the popovers opened from a menu (a help card, a list) are inside it.
 */
export function useChromeDismiss(open: boolean, close: () => void): void {
  useEffect(() => {
    if (!open) return;
    let stopped: Event | null = null;
    let timer: number | undefined;
    const onPress = (e: PointerEvent) => {
      if (e.target instanceof HTMLCanvasElement) return close();
      if (e.target instanceof Element && e.target.closest(POPOVER)) return;
      stopped = e;
      // After the event has been dispatched: by then `onReached` has cleared it if it got to the document.
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (stopped === e) close();
      });
    };
    const onReached = (e: Event) => {
      if (e === stopped) stopped = null;
    };
    window.addEventListener('pointerdown', onPress, true);
    document.addEventListener('pointerdown', onReached);
    document.addEventListener('fullscreenchange', close);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', onPress, true);
      document.removeEventListener('pointerdown', onReached);
      document.removeEventListener('fullscreenchange', close);
    };
  }, [open, close]);
}

/** A popover's content, Radix's or antd's: the menus, and the cards, lists and pickers opened from them. */
const POPOVER = '[data-radix-popper-content-wrapper], .ant-popover';

/** icons inherit currentColor; parent row hover shifts them to primary-8 */
const menuItemIconClass =
  'inline-flex size-4 shrink-0 items-center justify-center text-neutral-700 transition-colors group-hover:text-primary-8';

export function MenuButton({
  icon,
  label,
  testId,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  /** E2E handle. Several of these labels change with the state they toggle. */
  testId?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-neutral-100"
    >
      <span className={menuItemIconClass}>{icon}</span>
      {label}
    </button>
  );
}

/**
 * Antd paints its own blue when a control is on; these bring it to primary-9 so the menu
 * matches the rest of the app. Applied per control rather than through a provider, which
 * would recolour every antd control on the page.
 */
const ON_COLOR = 'var(--color-primary-9)';

/** A settings switch, primary-9 while on. */
export function ViewerSwitch({
  checked,
  testId,
  label,
  disabled,
  onChange,
}: {
  checked: boolean;
  testId?: string;
  /** Accessible name, where the row's label is not tied to the switch. */
  label?: string;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Switch
      data-testid={testId}
      aria-label={label}
      size="small"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      style={checked && !disabled ? { backgroundColor: ON_COLOR } : undefined}
    />
  );
}

/** A labelled slider row: {@link MenuRow} for controls that take a range. */
export function MenuSlider({
  label,
  testId,
  min,
  max,
  step,
  value,
  onChange,
  format,
  disabled,
}: {
  label: ReactNode;
  testId?: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  disabled?: boolean;
}) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'group flex w-full flex-col gap-1 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100',
        disabled && 'hover:bg-transparent'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn('flex items-center', disabled && 'opacity-50')}>{label}</span>
        <span className="tabular-nums text-neutral-500">{format ? format(value) : value}</span>
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        tooltip={{ formatter: null }}
        styles={
          disabled
            ? undefined
            : { track: { backgroundColor: ON_COLOR }, handle: { borderColor: ON_COLOR } }
        }
      />
    </div>
  );
}

export function MenuRow({
  label,
  icon,
  disabled,
  className,
  children,
}: {
  label: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'group flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100',
        className
      )}
    >
      <span className={cn('flex items-center gap-2', disabled && 'opacity-50')}>
        {/* reserve the icon column so labels align with the icon'd menu buttons */}
        <span className={menuItemIconClass}>{icon}</span>
        {label}
      </span>
      {children}
    </div>
  );
}

/** Two or three choices as a pill of round buttons, the one chosen filled. */
export function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: { value: T; label: string; icon?: ReactNode; text?: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-neutral-100 p-0.5',
        disabled && 'pointer-events-none opacity-50'
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              'inline-flex h-7 min-w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
              option.text && 'px-2',
              'focus-visible:outline-none',
              active ? 'bg-primary-8 text-white' : 'text-neutral-500 hover:bg-white'
            )}
          >
            {option.icon ?? option.text}
          </button>
        );
      })}
    </div>
  );
}

export function BackgroundToggle({
  dark,
  onChange,
}: {
  dark: boolean;
  onChange: (dark: boolean) => void;
}) {
  return (
    <SegmentedToggle
      value={dark ? 'dark' : 'light'}
      onChange={(v) => onChange(v === 'dark')}
      options={[
        {
          value: 'light',
          label: 'Light background',
          icon: dark ? (
            <RiSunLine className="size-4 shrink-0" />
          ) : (
            <RiSunFill className="size-4 shrink-0" />
          ),
        },
        {
          value: 'dark',
          label: 'Dark background',
          icon: dark ? (
            <RiMoonFill className="size-4 shrink-0" />
          ) : (
            <RiMoonLine className="size-4 shrink-0" />
          ),
        },
      ]}
    />
  );
}
