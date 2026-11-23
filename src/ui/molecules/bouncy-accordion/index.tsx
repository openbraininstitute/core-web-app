'use client';

import { motion, type Transition, useReducedMotion } from 'motion/react';
import { type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from 'react';

import { EASE_OUT } from '@/constants/motion';
import { Icon } from '@/ui/molecules/icon';
import { cn } from '@/utils/css-class';

export type TBouncyAccordionItem = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  disabled?: boolean;
};

export type TBouncyAccordionClassNames = {
  root?: string;
  item?: string;
  trigger?: string;
  icon?: string;
  title?: string;
  chevron?: string;
  content?: string;
  description?: string;
};

export interface IBouncyAccordionProps {
  items: TBouncyAccordionItem[];
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
  collapsible?: boolean;
  className?: string;
  classNames?: TBouncyAccordionClassNames;
}

const ROW_TRANSITION: Transition = { type: 'spring', duration: 0.55, bounce: 0.38 };
const CONTENT_OPEN_TRANSITION: Transition = { type: 'spring', duration: 0.58, bounce: 0.32 };
const CLOSE_TRANSITION: Transition = { type: 'spring', duration: 0.55, bounce: 0.38 };
const DESCRIPTION_TRANSITION: Transition = { duration: 0.18, ease: EASE_OUT };
const CHEVRON_TRANSITION: Transition = { type: 'spring', duration: 0.42, bounce: 0.28 };

function useControllableAccordionValue({
  value,
  defaultValue,
  onValueChange,
}: {
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string | null) => void;
}) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? null);
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : internalValue;
  const setValue = useCallback(
    (next: string | null) => {
      if (!isControlled) setInternalValue(next);
      onValueChange?.(next);
    },
    [isControlled, onValueChange]
  );
  return [currentValue, setValue] as const;
}

function BouncyAccordionRow({
  item,
  open,
  startsGroup,
  endsGroup,
  separatedFromPrevious,
  contentId,
  triggerId,
  reduce,
  closing,
  classNames,
  onToggle,
}: {
  item: TBouncyAccordionItem;
  open: boolean;
  closing: boolean;
  startsGroup: boolean;
  endsGroup: boolean;
  separatedFromPrevious: boolean;
  contentId: string;
  triggerId: string;
  reduce: boolean | null;
  classNames?: TBouncyAccordionClassNames;
  onToggle: () => void;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useLayoutEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const updateHeight = () => setContentHeight(node.offsetHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const rowTransition = reduce ? { duration: 0 } : closing ? CLOSE_TRANSITION : ROW_TRANSITION;
  const contentTransition = reduce
    ? { duration: 0 }
    : open
      ? CONTENT_OPEN_TRANSITION
      : CLOSE_TRANSITION;

  return (
    <motion.div
      layout="position"
      initial={false}
      style={{ marginTop: separatedFromPrevious ? 12 : 0 }}
      transition={rowTransition}
    >
      <motion.div
        layout={!reduce}
        data-state={open ? 'open' : 'closed'}
        initial={false}
        animate={{
          borderTopLeftRadius: startsGroup ? 20 : 0,
          borderTopRightRadius: startsGroup ? 20 : 0,
          borderBottomLeftRadius: endsGroup ? 20 : 0,
          borderBottomRightRadius: endsGroup ? 20 : 0,
        }}
        transition={reduce ? { duration: 0 } : { ...ROW_TRANSITION, layout: contentTransition }}
        className={cn(
          'overflow-hidden bg-white text-primary-9',
          item.disabled && 'opacity-50',
          classNames?.item
        )}
      >
        <motion.button
          layout={!reduce}
          transition={reduce ? { duration: 0 } : { layout: contentTransition }}
          id={triggerId}
          type="button"
          disabled={item.disabled}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={onToggle}
          className={cn(
            'flex min-h-[48px] w-full items-center gap-3 px-4 text-left outline-none transition-colors',
            'focus-visible:bg-fill-2',
            'disabled:pointer-events-none',
            classNames?.trigger
          )}
        >
          {item.icon ? (
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center text-neutral-4',
                classNames?.icon
              )}
            >
              {item.icon}
            </span>
          ) : null}
          <span
            className={cn(
              'min-w-0 flex-1 truncate text-[14px] font-semibold text-primary-9',
              classNames?.title
            )}
          >
            {item.title}
          </span>
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={reduce ? { duration: 0 } : CHEVRON_TRANSITION}
            className={cn(
              'grid size-6 shrink-0 place-items-center text-neutral-4',
              classNames?.chevron
            )}
          >
            <Icon name="chevronDown" size={15} />
          </motion.span>
        </motion.button>

        <motion.section
          layout={!reduce}
          id={contentId}
          aria-labelledby={triggerId}
          aria-hidden={!open}
          inert={!open}
          initial={false}
          // Closed at 1px, not 0: a layout animation can't scale from a 0px size.
          style={{
            height: item.description ? (open ? contentHeight || 'auto' : 1) : 0,
            originY: 0,
          }}
          transition={contentTransition}
          className={cn('overflow-hidden', classNames?.content)}
        >
          <motion.div
            ref={contentRef}
            layout={!reduce}
            animate={{ opacity: open ? 1 : 0 }}
            transition={
              reduce ? { duration: 0 } : { ...DESCRIPTION_TRANSITION, layout: contentTransition }
            }
            className="px-2 pb-2"
          >
            <div className={cn('text-[14px] text-neutral-4', classNames?.description)}>
              {item.description}
            </div>
          </motion.div>
        </motion.section>
      </motion.div>
    </motion.div>
  );
}

export function BouncyAccordion({
  items,
  value,
  defaultValue = null,
  onValueChange,
  collapsible = true,
  className,
  classNames,
}: IBouncyAccordionProps) {
  const reduce = useReducedMotion();
  const baseId = useId();
  const [activeValue, setActiveValue] = useControllableAccordionValue({
    value,
    defaultValue,
    onValueChange,
  });
  const activeIndex = items.findIndex((item) => item.id === activeValue);

  const [previousValue, setPreviousValue] = useState(activeValue);
  const [closedValue, setClosedValue] = useState<string | null>(null);
  if (previousValue !== activeValue) {
    setPreviousValue(activeValue);
    setClosedValue(previousValue);
  }
  const closedIndex = items.findIndex((item) => item.id === closedValue);

  const toggleItem = useCallback(
    (id: string) => {
      if (activeValue === id) {
        if (collapsible) setActiveValue(null);
        return;
      }
      setActiveValue(id);
    },
    [activeValue, collapsible, setActiveValue]
  );

  return (
    <div className={cn('w-full', className, classNames?.root)}>
      {items.map((item, index) => {
        const open = activeValue === item.id;
        const previousIsOpen = activeIndex === index - 1;
        const nextIsOpen = activeIndex === index + 1;
        const startsGroup = open || index === 0 || previousIsOpen;
        const endsGroup = open || index === items.length - 1 || nextIsOpen;
        const separatedFromPrevious = index > 0 && (open || previousIsOpen);
        return (
          <BouncyAccordionRow
            key={item.id}
            item={item}
            open={open}
            startsGroup={startsGroup}
            endsGroup={endsGroup}
            separatedFromPrevious={separatedFromPrevious}
            contentId={`${baseId}-${item.id}-content`}
            triggerId={`${baseId}-${item.id}-trigger`}
            reduce={reduce}
            closing={closedIndex !== -1 && index >= closedIndex}
            classNames={classNames}
            onToggle={() => toggleItem(item.id)}
          />
        );
      })}
    </div>
  );
}
