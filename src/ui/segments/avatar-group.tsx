'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ComponentPropsWithRef, type MouseEvent, type PointerEvent, useState } from 'react';

import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from '@/constants/motion';
import { useHoverCapable } from '@/hooks/use-hover-capable';
import { AgentBadge, agentRadiusOf } from '@/ui/molecules/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/molecules/tooltip';
import { cn } from '@/utils/css-class';

export interface IAvatarGroupMember {
  id: string;
  name: string;
  /** Without one, or if it fails, initials show. */
  src?: string;
  colour?: string;
  initials?: string;
  agent?: boolean;
  active?: boolean;
}

const SIZES = {
  sm: { box: 'size-7 text-[10px]', px: 28 },
  md: { box: 'size-9 text-xs', px: 36 },
  lg: { box: 'size-11 text-sm', px: 44 },
} as const;

type TAvatarSize = keyof typeof SIZES;

export interface IAvatarGroupLabels {
  readonly showFewer?: string;
  readonly showMore?: (count: number) => string;
}

const showMoreMembers = (count: number): string => `Show ${count} more members`;

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2);
  return letters.toUpperCase();
}

export interface IAvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  name: string;
  src?: string | undefined;
  size?: TAvatarSize;
  colour?: string | undefined;
  initials?: string | undefined;
}

export function Avatar({
  name,
  src,
  size = 'md',
  colour,
  initials: shown,
  className,
  style,
  ...props
}: IAvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>();
  const showImage = src && failedSrc !== src;
  return (
    <span
      {...props}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-medium text-neutral-4 ring-2 ring-white select-none',
        SIZES[size].box,
        colour ? 'text-white' : '',
        className
      )}
      style={colour ? { ...style, background: colour } : style}
    >
      {showImage ? (
        // biome-ignore lint/performance/noImgElement: avatars come from any host and fall back to initials
        <img
          src={src}
          alt={name}
          draggable={false}
          onError={() => setFailedSrc(src)}
          className="size-full object-cover"
        />
      ) : (
        <>
          <span aria-hidden="true">{shown ?? initials(name)}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  );
}

export interface IAvatarGroupProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  members: IAvatarGroupMember[];
  /** Shown before the rest collapse into +N. */
  max?: number;
  size?: TAvatarSize;
  /** Pair with `onExpandedChange`. */
  expanded?: boolean;
  defaultExpanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** Accessible name for the list. */
  label?: string;
  labels?: IAvatarGroupLabels;
  /** +N calls this instead of expanding. */
  onMore?: ((event: MouseEvent<HTMLButtonElement>) => void) | undefined;
  /** aria-expanded of the +N button. */
  moreOpen?: boolean | undefined;
}

export function AvatarGroup({
  members,
  max = 4,
  size = 'md',
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  label,
  labels,
  onMore,
  moreOpen,
  className,
  ...props
}: IAvatarGroupProps) {
  const showFewer = labels?.showFewer ?? 'Show fewer members';
  const showMore = labels?.showMore ?? showMoreMembers;
  const reduce = useReducedMotion();
  const canHover = useHoverCapable();
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const isExpanded = onMore ? false : (expanded ?? internalExpanded);
  const [hovered, setHovered] = useState<number | null>(null);

  const limit = Math.max(1, max);
  const overflow = Math.max(0, members.length - limit);
  const visible = isExpanded ? members : members.slice(0, limit);
  const px = SIZES[size].px;
  const overlap = Math.round(px / 3);
  const push = Math.round(overlap * 0.75);
  const parting = !reduce && canHover && hovered !== null;
  const offset = (index: number) =>
    !parting || index === hovered ? 0 : index < (hovered ?? 0) ? -push : push;
  const hoverHandlers = (index: number) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setHovered(index);
    },
  });

  const toggle = () => {
    const next = !isExpanded;
    if (expanded === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  return (
    <div
      {...props}
      onPointerLeave={(event) => {
        props.onPointerLeave?.(event);
        setHovered(null);
      }}
      className={cn('inline-flex items-center', className)}
    >
      <ul aria-label={label ?? 'Members'} className="relative flex items-center">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((member, index) => (
            <motion.li
              key={member.id}
              layout={reduce ? false : 'position'}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{
                opacity: 0,
                scale: reduce ? 1 : 0.6,
                transition: { duration: 0.14, ease: EASE_OUT },
              }}
              transition={{
                layout: SPRING_LAYOUT,
                scale: SPRING_LAYOUT,
                opacity: { duration: 0.18, ease: EASE_OUT },
              }}
              style={{
                marginLeft: index === 0 ? 0 : -overlap,
                zIndex: parting && hovered === index ? visible.length + 1 : index,
                position: 'relative',
              }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.span
                    className={cn('relative block rounded-full', member.active && 'writing-ring')}
                    style={{
                      ...(member.colour ? { '--ring': member.colour } : {}),
                      ...(member.agent ? { borderRadius: agentRadiusOf(SIZES[size].px) } : {}),
                    }}
                    {...hoverHandlers(index)}
                    animate={{
                      x: offset(index),
                      y: parting && hovered === index ? -3 : 0,
                      scale: parting && hovered === index ? 1.06 : 1,
                    }}
                    transition={SPRING_LAYOUT}
                  >
                    <Avatar
                      name={member.name}
                      src={member.src}
                      size={size}
                      colour={member.colour}
                      initials={member.initials}
                      {...(member.agent
                        ? { style: { borderRadius: agentRadiusOf(SIZES[size].px) } }
                        : {})}
                    />
                    {member.agent ? (
                      <AgentBadge size={SIZES[size].px} colour={member.colour ?? 'currentColor'} />
                    ) : null}
                  </motion.span>
                </TooltipTrigger>
                <TooltipContent side="top" sideOffset={6}>
                  {member.name}
                </TooltipContent>
              </Tooltip>
            </motion.li>
          ))}
          {overflow > 0 ? (
            <motion.li
              key="overflow"
              layout={reduce ? false : 'position'}
              transition={{ layout: SPRING_LAYOUT }}
              style={{ marginLeft: -overlap, zIndex: visible.length, position: 'relative' }}
            >
              <motion.span
                className="block"
                {...hoverHandlers(visible.length)}
                animate={{ x: offset(visible.length) }}
                transition={SPRING_LAYOUT}
              >
                <motion.button
                  type="button"
                  aria-expanded={onMore ? (moreOpen ?? false) : isExpanded}
                  aria-haspopup={onMore ? 'dialog' : undefined}
                  aria-label={isExpanded ? showFewer : showMore(overflow)}
                  onClick={onMore ?? toggle}
                  {...(reduce ? {} : { whileTap: { scale: 0.92 } })}
                  transition={SPRING_PRESS}
                  className={cn(
                    'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-9 font-medium text-white tabular-nums ring-2 ring-white outline-none focus-visible:ring-primary-4',
                    SIZES[size].box
                  )}
                >
                  <AnimatePresence initial={false} mode="popLayout">
                    <motion.span
                      key={isExpanded ? 'less' : 'more'}
                      aria-hidden="true"
                      initial={{ opacity: 0, y: reduce ? 0 : isExpanded ? 8 : -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: reduce ? 0 : isExpanded ? -8 : 8 }}
                      transition={{ duration: 0.16, ease: EASE_OUT }}
                    >
                      {isExpanded ? '−' : `+${overflow}`}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </motion.span>
            </motion.li>
          ) : null}
        </AnimatePresence>
      </ul>
    </div>
  );
}
