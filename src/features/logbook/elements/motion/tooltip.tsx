'use client';

import { AnimatePresence } from 'motion/react';
import {
  type ComponentProps,
  cloneElement,
  createContext,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  type Ref,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { TooltipSurface } from '@/features/logbook/elements/motion/tooltip-surface';
import { useDismiss } from '@/hooks/use-dismiss';
import { useHoverGesture } from '@/hooks/use-hover-gesture';
import { useTapGesture } from '@/hooks/use-tap-gesture';
import { cn } from '@/utils/css-class';

import { focusFromKeyboard, graceArea, inBox, inPolygon, watchModality } from './tooltip/grace';
import { TooltipArrow, TooltipPositioner } from './tooltip/positioner';
import {
  type TooltipAlign,
  type TooltipAnchor,
  type TooltipPoint,
  type TooltipSide,
  useTooltipPointer,
} from './tooltip/use-position';

export type { TooltipAlign, TooltipSide };

interface TooltipTiming {
  delay: number;
  closeDelay: number;
  /** After one closes, others open instantly for this long (ms). */
  skipDelay: number;
}

const TimingContext = createContext<TooltipTiming>({ delay: 120, closeDelay: 0, skipDelay: 300 });

export interface TooltipProviderProps extends Partial<TooltipTiming> {
  children: ReactNode;
}

/** Shared timing for tooltips inside it; optional. */
export function TooltipProvider({ children, ...timing }: TooltipProviderProps) {
  const parent = useContext(TimingContext);
  const {
    delay = parent.delay,
    closeDelay = parent.closeDelay,
    skipDelay = parent.skipDelay,
  } = timing;
  const value = useMemo(() => ({ delay, closeDelay, skipDelay }), [delay, closeDelay, skipDelay]);
  return <TimingContext.Provider value={value}>{children}</TimingContext.Provider>;
}

// One label at a time; after one closes, the next opens instantly.
let lastClosedAt = 0;
let current: { close: () => void } | null = null;

function isEmpty(content: ReactNode) {
  return content == null || content === false || content === '';
}

interface TooltipContextValue {
  open: boolean;
  contentId: string;
  labelId: string;
  asLabel: boolean;
  empty: boolean;
  followCursor: boolean;
  anchor: TooltipAnchor | null;
  /** False when the anchor is an external `anchorRef`. */
  triggered: boolean;
  floatingRef: RefObject<HTMLSpanElement | null>;
  pointer: ReturnType<typeof useTooltipPointer>;
  setTrigger: (element: TooltipAnchor | null) => void;
  setEmpty: (empty: boolean) => void;
  close: () => void;
  onContentEnter: () => void;
  onContentLeave: (event: ReactPointerEvent) => void;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

function useTooltipContext(part: string) {
  const context = useContext(TooltipContext);
  if (!context) throw new Error(`${part} must be used inside <Tooltip>`);
  return context;
}

export interface TooltipRootProps {
  children?: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hover delay (ms); keyboard focus shows at once. */
  delay?: number;
  closeDelay?: number;
  disabled?: boolean;
  /** Name the trigger instead of describing it, for icon-only controls. */
  asLabel?: boolean;
  /** Keyboard focus still uses the anchor. */
  followCursor?: boolean;
  /** External anchor, e.g. chart cells. */
  anchorRef?: RefObject<TooltipAnchor | null>;
  /** Surface id, for anchors that point at it themselves. */
  id?: string;
}

function TooltipRoot({
  children,
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  delay: delayProp,
  closeDelay: closeDelayProp,
  disabled = false,
  asLabel = false,
  followCursor = false,
  anchorRef,
  id,
  initialEmpty = false,
}: TooltipRootProps & { initialEmpty?: boolean }) {
  const timing = useContext(TimingContext);
  const delay = delayProp ?? timing.delay;
  const closeDelay = closeDelayProp ?? timing.closeDelay;
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const open = controlledOpen ?? uncontrolledOpen;
  const [empty, setEmpty] = useState(initialEmpty);
  const [trigger, setTrigger] = useState<TooltipAnchor | null>(null);
  const [external, setExternal] = useState<TooltipAnchor | null>(null);
  const anchor = anchorRef ? external : trigger;
  const generatedId = useId();
  const contentId = id ?? `${generatedId}-content`;
  const labelId = `${generatedId}-label`;
  const floatingRef = useRef<HTMLSpanElement | null>(null);
  const anchorObject = useRef<TooltipAnchor | null>(null);
  const pointer = useTooltipPointer(anchor, followCursor);

  // An external ref can attach after render; pick it up once it has.
  useLayoutEffect(() => {
    if (!anchorRef) return;
    const element = anchorRef.current ?? null;
    if (element !== external) setExternal(element);
  });

  // Read by listeners without re-binding them.
  const latest = useRef({
    open,
    delay,
    closeDelay,
    disabled,
    empty,
    onOpenChange,
    controlled: false,
  });
  useLayoutEffect(() => {
    anchorObject.current = anchor;
    latest.current = {
      open,
      delay,
      closeDelay,
      disabled,
      empty,
      onOpenChange,
      controlled: controlledOpen !== undefined,
    };
  });

  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const grace = useRef<(() => void) | null>(null);
  const self = useRef<{ close: () => void }>({ close: () => {} });

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const stopGrace = useCallback(() => {
    grace.current?.();
    grace.current = null;
  }, []);

  // Only a real change reaches the consumer.
  const commit = useCallback((next: boolean) => {
    if (latest.current.open === next) return;
    if (!latest.current.controlled) setUncontrolledOpen(next);
    latest.current.onOpenChange?.(next);
  }, []);

  const openNow = useCallback(() => {
    clearTimers();
    stopGrace();
    if (latest.current.disabled || latest.current.empty) return;
    if (current && current !== self.current) current.close();
    current = self.current;
    commit(true);
  }, [clearTimers, stopGrace, commit]);

  const close = useCallback(() => {
    clearTimers();
    stopGrace();
    if (latest.current.open) lastClosedAt = Date.now();
    if (current === self.current) current = null;
    commit(false);
  }, [clearTimers, stopGrace, commit]);
  useLayoutEffect(() => {
    self.current.close = close;
  }, [close]);

  const requestOpen = useCallback(() => {
    clearTimers();
    if (latest.current.open || latest.current.disabled || latest.current.empty) return;
    const warm = Date.now() - lastClosedAt < timing.skipDelay;
    if (warm || latest.current.delay <= 0) openNow();
    else openTimer.current = setTimeout(openNow, latest.current.delay);
  }, [clearTimers, openNow, timing.skipDelay]);

  const requestClose = useCallback(() => {
    clearTimers();
    if (latest.current.closeDelay > 0) {
      closeTimer.current = setTimeout(close, latest.current.closeDelay);
    } else close();
  }, [clearTimers, close]);

  // Hold the label open while the pointer crosses from one box toward the other.
  const startGrace = useCallback(
    (exit: TooltipPoint, from: Element, to: Element | null) => {
      stopGrace();
      if (!to) return requestClose();
      const target = to.getBoundingClientRect();
      const origin = from.getBoundingClientRect();
      const corridor = graceArea(exit, target);
      const onMove = (event: PointerEvent) => {
        const point = { x: event.clientX, y: event.clientY };
        if (inBox(point, target) || inBox(point, origin)) return;
        if (!inPolygon(point, corridor)) requestClose();
      };
      document.addEventListener('pointermove', onMove);
      grace.current = () => document.removeEventListener('pointermove', onMove);
    },
    [stopGrace, requestClose]
  );

  const hover = useHoverGesture();
  const tap = useTapGesture<boolean>();

  // Listen on the trigger itself so its own handlers stay and no wrapper is added.
  useEffect(() => {
    if (anchorRef || !trigger) return;
    watchModality();
    // A mouse press hides the label until the pointer leaves.
    let suppressed = false;
    // Focus that came from the keyboard holds the label open on its own.
    let keyboardFocus = false;

    const onEnter = (event: PointerEvent) => {
      if (!hover.enter(event)) return;
      stopGrace();
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (!suppressed) requestOpen();
    };
    const onLeave = (event: PointerEvent) => {
      if (!hover.leave(event)) return;
      suppressed = false;
      if (keyboardFocus) return;
      if (openTimer.current) {
        clearTimers();
        return;
      }
      if (latest.current.open && !followCursor) {
        startGrace({ x: event.clientX, y: event.clientY }, trigger, floatingRef.current);
      } else requestClose();
    };
    const onDown = (event: PointerEvent) => {
      tap.start(event, latest.current.open);
      if (event.pointerType === 'mouse') {
        suppressed = true;
        close();
      }
    };
    // Touch never hovers and Safari won't focus on tap, so a tap toggles the label.
    const onClick = () => {
      const gesture = tap.take();
      if (!gesture || gesture.pointerType === 'mouse') return;
      if (gesture.state) close();
      else openNow();
    };
    const onKey = () => tap.drop();
    const onFocusIn = () => {
      if (!focusFromKeyboard()) return;
      keyboardFocus = true;
      openNow();
    };
    const onFocusOut = (event: FocusEvent) => {
      if (trigger.contains(event.relatedTarget as Node | null)) return;
      keyboardFocus = false;
      close();
    };

    const el = trigger as HTMLElement;
    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointercancel', tap.drop);
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', onKey);
    el.addEventListener('focusin', onFocusIn);
    el.addEventListener('focusout', onFocusOut);
    return () => {
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointercancel', tap.drop);
      el.removeEventListener('click', onClick);
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('focusin', onFocusIn);
      el.removeEventListener('focusout', onFocusOut);
    };
  }, [
    anchorRef,
    trigger,
    followCursor,
    hover,
    tap,
    requestOpen,
    requestClose,
    openNow,
    close,
    clearTimers,
    stopGrace,
    startGrace,
  ]);

  // A trigger turning disabled never blurs, and a blurred window never reports leave.
  useEffect(() => {
    if (!open || anchorRef || !trigger) return;
    const observer = new MutationObserver(() => {
      if (trigger.matches(":disabled, [aria-disabled='true']")) close();
    });
    observer.observe(trigger, { attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
    window.addEventListener('blur', close);
    return () => {
      observer.disconnect();
      window.removeEventListener('blur', close);
    };
  }, [open, anchorRef, trigger, close]);

  // Charts swap content while open, so only trigger-owned labels close when empty.
  useEffect(() => {
    if (disabled || (empty && !anchorRef)) close();
  }, [disabled, empty, anchorRef, close]);

  useEffect(
    () => () => {
      clearTimers();
      stopGrace();
      if (current === self.current) current = null;
    },
    [clearTimers, stopGrace]
  );

  const insideTooltip = useCallback(
    (target: Element) => Boolean(floatingRef.current?.contains(target)),
    []
  );
  // Close on a tap elsewhere or Escape; the tap still reaches what it hit.
  useDismiss(open, close, anchorObject, { ignore: insideTooltip });

  const onContentEnter = useCallback(() => {
    stopGrace();
    clearTimers();
  }, [stopGrace, clearTimers]);

  const onContentLeave = useCallback(
    (event: ReactPointerEvent) => {
      const floating = floatingRef.current;
      if (!floating) return;
      if (anchorRef) {
        // Bridge the small gap back onto a chart.
        clearTimers();
        closeTimer.current = setTimeout(close, 100);
        return;
      }
      startGrace({ x: event.clientX, y: event.clientY }, floating, anchorObject.current);
    },
    [anchorRef, clearTimers, close, startGrace]
  );

  const value = useMemo<TooltipContextValue>(
    () => ({
      open,
      contentId,
      labelId,
      asLabel,
      empty,
      followCursor,
      anchor,
      triggered: !anchorRef,
      floatingRef,
      pointer,
      setTrigger,
      setEmpty,
      close,
      onContentEnter,
      onContentLeave,
    }),
    [
      open,
      contentId,
      labelId,
      asLabel,
      empty,
      followCursor,
      anchor,
      anchorRef,
      pointer,
      close,
      onContentEnter,
      onContentLeave,
    ]
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

function mergeIds(...ids: unknown[]) {
  return ids.filter((value) => typeof value === 'string' && value).join(' ') || undefined;
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as { current: T | null }).current = value;
}

export interface TooltipTriggerProps extends ComponentProps<'button'> {
  /** Use the single child element as the trigger instead of rendering a button. */
  asChild?: boolean;
}

export function TooltipTrigger({ asChild = false, children, ref, ...props }: TooltipTriggerProps) {
  const { open, contentId, labelId, asLabel, empty, setTrigger } =
    useTooltipContext('TooltipTrigger');
  const child = asChild && isValidElement(children) ? children : null;
  const childProps = (child?.props ?? props) as Record<string, unknown>;
  const childRef = child ? (childProps.ref as Ref<TooltipAnchor> | undefined) : undefined;
  const attached = useRef<TooltipAnchor | null>(null);

  const setRef = useCallback(
    (element: TooltipAnchor | null) => {
      attached.current = element;
      setTrigger(element);
      assignRef(childRef ?? (ref as Ref<TooltipAnchor> | undefined), element);
    },
    [setTrigger, childRef, ref]
  );

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' && child && !attached.current) {
      console.warn(
        'TooltipTrigger: the child did not attach a ref, so the tooltip has nothing to listen to. Render a DOM element or a component that passes `ref` through.'
      );
    }
  }, [child]);

  const aria = asLabel
    ? {
        'aria-labelledby': empty ? (childProps['aria-labelledby'] as string | undefined) : labelId,
      }
    : {
        'aria-describedby': mergeIds(
          childProps['aria-describedby'],
          open && !empty ? contentId : undefined
        ),
      };

  if (asChild) {
    if (!child) return children;
    return cloneElement(child as ReactElement<Record<string, unknown>>, { ref: setRef, ...aria });
  }

  return (
    <button
      type="button"
      data-state={open ? 'open' : 'closed'}
      {...props}
      ref={setRef as Ref<HTMLButtonElement>}
      {...aria}
    >
      {children}
    </button>
  );
}

export interface TooltipContentProps {
  children?: ReactNode;
  side?: TooltipSide | undefined;
  align?: TooltipAlign | undefined;
  /** Gap to the anchor (px). */
  sideOffset?: number | undefined;
  arrow?: boolean | undefined;
  /** Point in the anchor, as fractions of its width and height. */
  anchorPoint?: TooltipPoint | undefined;
  className?: string | undefined;
}

export function TooltipContent({
  children,
  side = 'top',
  align = 'center',
  sideOffset,
  arrow = false,
  anchorPoint,
  className,
}: TooltipContentProps) {
  const {
    open,
    contentId,
    labelId,
    asLabel,
    followCursor,
    anchor,
    floatingRef,
    pointer,
    setEmpty,
    close,
    onContentEnter,
    onContentLeave,
  } = useTooltipContext('TooltipContent');
  const empty = isEmpty(children);
  const arrowRef = useRef<SVGSVGElement | null>(null);

  useLayoutEffect(() => {
    setEmpty(empty);
  }, [empty, setEmpty]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Apart from the surface so the name exists while closed. */}
      {asLabel && !empty ? (
        <span id={labelId} hidden>
          {children}
        </span>
      ) : null}
      <AnimatePresence>
        {open && !empty ? (
          <TooltipPositioner
            key="tooltip"
            anchor={anchor}
            floatingRef={floatingRef}
            arrowRef={arrow ? arrowRef : undefined}
            anchorPoint={anchorPoint}
            followCursor={followCursor}
            side={side}
            align={align}
            sideOffset={sideOffset}
            onDismiss={close}
            pointer={pointer}
          >
            {(positioned, isPresent, placedSide) => (
              <TooltipSurface
                id={asLabel ? undefined : contentId}
                aria-hidden={asLabel || undefined}
                ready={positioned}
                onPointerEnter={onContentEnter}
                onPointerLeave={onContentLeave}
                style={{ pointerEvents: isPresent && !followCursor ? 'auto' : 'none' }}
                className={cn(
                  'max-w-[min(20rem,calc(100vw-16px))] whitespace-normal break-words',
                  arrow && 'relative',
                  className
                )}
              >
                {children}
                {arrow ? <TooltipArrow ref={arrowRef} side={placedSide} /> : null}
              </TooltipSurface>
            )}
          </TooltipPositioner>
        ) : null}
      </AnimatePresence>
    </>,
    document.body
  );
}

export interface TooltipProps
  extends TooltipRootProps,
    Omit<TooltipContentProps, 'children' | 'className'> {
  /** Shorthand: with it, `children` is the trigger. */
  content?: ReactNode;
  /** Shorthand only: surface classes. */
  className?: string;
}

export function Tooltip(props: TooltipProps) {
  if (!('content' in props)) return <TooltipRoot {...props} />;
  const { content, children, side, align, sideOffset, arrow, anchorPoint, className, ...root } =
    props;
  if (!root.anchorRef && !isValidElement(children)) return children ?? null;
  return (
    <TooltipRoot {...root} initialEmpty={isEmpty(content)}>
      {isValidElement(children) ? <TooltipTrigger asChild>{children}</TooltipTrigger> : null}
      <TooltipContent
        side={side}
        align={align}
        sideOffset={sideOffset}
        arrow={arrow}
        anchorPoint={anchorPoint}
        className={className}
      >
        {content}
      </TooltipContent>
    </TooltipRoot>
  );
}
