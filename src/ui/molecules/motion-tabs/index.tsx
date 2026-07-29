'use client';

/**
 * Motion tabs — adapted from https://beui.dev/components/motion/tabs
 *
 * The active indicator is a shared `layoutId` element, so switching tabs slides it between
 * triggers instead of cutting. Colours are mapped onto this app's palette rather than beui's
 * semantic tokens.
 */

import { MotionConfig, motion, type Transition, useReducedMotion } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useId,
  useMemo,
  useState,
} from 'react';

import { cn } from '@/utils/css-class';

type TMotionTabsVariant = 'pill' | 'underline' | 'segment';

type TMotionTabsContext = {
  value: string;
  setValue: (value: string) => void;
  layoutId: string;
  variant: TMotionTabsVariant;
};

const MotionTabsContext = createContext<TMotionTabsContext | null>(null);

function useMotionTabs() {
  const context = useContext(MotionTabsContext);
  if (!context) throw new Error('MotionTabs.* must be used inside <MotionTabs>');
  return context;
}

const INDICATOR_TRANSITION: Transition = {
  type: 'spring',
  stiffness: 170,
  damping: 24,
  mass: 1.2,
};

const CONTENT_EASE_OUT = [0.16, 1, 0.3, 1] as const;

export function MotionTabs({
  defaultValue,
  value,
  onValueChange,
  variant = 'pill',
  children,
  className,
}: {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  variant?: TMotionTabsVariant;
  children: ReactNode;
  className?: string;
}) {
  const [internal, setInternal] = useState(defaultValue ?? '');
  const layoutId = useId();
  const reduce = useReducedMotion();
  const controlled = value !== undefined;
  const current = controlled ? value : internal;

  const setValue = useCallback(
    (next: string) => {
      if (!controlled) setInternal(next);
      onValueChange?.(next);
    },
    [controlled, onValueChange]
  );

  const contextValue = useMemo(
    () => ({ value: current, setValue, layoutId, variant }),
    [current, layoutId, setValue, variant]
  );

  return (
    <MotionConfig transition={reduce ? { duration: 0 } : INDICATOR_TRANSITION}>
      <MotionTabsContext.Provider value={contextValue}>
        <motion.div layoutRoot className={className}>
          {children}
        </motion.div>
      </MotionTabsContext.Provider>
    </MotionConfig>
  );
}

const listClasses: Record<TMotionTabsVariant, string> = {
  pill: 'inline-flex w-full items-center gap-1 rounded-full bg-gray-50 p-1',
  underline: 'inline-flex items-center gap-1 border-neutral-2 border-b',
  segment: 'inline-flex w-full items-center gap-0 rounded-lg bg-gray-50 p-0.5',
};

export function MotionTabsList({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { variant } = useMotionTabs();

  return (
    <div role="tablist" className={cn(listClasses[variant], className)}>
      {children}
    </div>
  );
}

export function MotionTabsTrigger({
  value,
  children,
  className,
  indicatorClassName,
}: {
  value: string;
  children: ReactNode;
  className?: string;
  indicatorClassName?: string;
}) {
  const { value: current, setValue, layoutId, variant } = useMotionTabs();
  const active = current === value;

  if (variant === 'underline') {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setValue(value)}
        className={cn(
          'relative isolate -mb-px inline-flex min-h-11 items-center px-3 pt-1 pb-2.5',
          'text-sm font-medium transition-colors',
          active ? 'text-primary-9' : 'text-gray-500 hover:text-primary-9',
          className
        )}
      >
        {children}
        {active && (
          <motion.span
            layoutId={layoutId}
            className={cn(
              'bg-primary-9 absolute right-0 -bottom-px left-0 h-px',
              indicatorClassName
            )}
          />
        )}
      </button>
    );
  }

  const radius = variant === 'pill' ? 'rounded-full' : 'rounded-md';

  return (
    <div className="relative flex-1">
      {active && (
        <motion.span
          layoutId={layoutId}
          style={{ borderRadius: variant === 'pill' ? 9999 : 8 }}
          className={cn('bg-primary-9 absolute inset-0', radius, indicatorClassName)}
        />
      )}
      <button
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => setValue(value)}
        className={cn(
          'relative z-10 inline-flex w-full items-center justify-center whitespace-nowrap',
          'bg-transparent px-3.5 py-2 text-sm font-medium outline-none transition-colors',
          active ? 'text-white' : 'text-primary-9 hover:text-primary-8',
          radius,
          className
        )}
      >
        {children}
      </button>
    </div>
  );
}

export function MotionTabsContent({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const { value: current } = useMotionTabs();
  const reduce = useReducedMotion();

  if (current !== value) {
    return (
      <div hidden className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      key={value}
      initial={{ opacity: 0, y: reduce ? 0 : 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: CONTENT_EASE_OUT }}
      className={cn('mt-4', className)}
    >
      {children}
    </motion.div>
  );
}
