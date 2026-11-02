'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

import { config } from '@/config';
import { learnFlag, useFlag } from '@/features/feature-flags';
import { useWorkspace } from '@/ui/hooks/use-workspace';
import { categories, shortcutHref } from '@/ui/segments/project/start/shortcuts';
import { cn } from '@/utils/css-class';

import type { CSSProperties, ReactNode } from 'react';
import type { ICategory, IShortcut } from '@/ui/segments/project/start/shortcuts';

/** Each group's colour, in the order the groups come: the institute's navy, learning's blue, building's teal. */
export const GROUP_COLORS = ['#002766', '#1677ff', '#08979c'] as const;

/** The first home's places in their groups, and the project the relative ones are in. */
export function useShortcutGroups(): { groups: ICategory[]; base: string } {
  const { virtualLabId, projectId } = useWorkspace();
  const learn = useFlag(learnFlag.key) === true;
  const groups = useMemo(() => categories({ learn }), [learn]);
  return { groups, base: `${config.ROOT_ROUTE}/${virtualLabId}/${projectId}` };
}

/** A place: a link to it, or, with no page there yet, the same thing greyed and "Coming soon". */
export function Place({
  shortcut,
  base,
  className,
  style,
  children,
  onPoint,
  onLeave,
}: {
  shortcut: IShortcut;
  base: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
  onPoint?: () => void;
  onLeave?: () => void;
}) {
  if (!shortcut.href) {
    return (
      <span
        className={cn(className, 'cursor-default opacity-40')}
        style={style}
        title="Coming soon"
      >
        {children}
      </span>
    );
  }
  return (
    <Link
      href={shortcutHref(shortcut.href, base)}
      className={className}
      style={style}
      onMouseEnter={onPoint}
      onMouseLeave={onLeave}
      onFocus={onPoint}
      onBlur={onLeave}
    >
      {children}
    </Link>
  );
}

/** A place's icon, in the colour of the text round it. */
export function PlaceIcon({
  icon,
  size = 16,
  className,
}: {
  icon: string;
  size?: number;
  className?: string;
}) {
  const mask = `url(/images/start/icons/${icon}.svg) center / contain no-repeat`;
  return (
    <span
      aria-hidden
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{ width: size, height: size, mask, WebkitMask: mask }}
    />
  );
}

/** A box's size as it is laid out, for a design drawn to it. */
export function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const box = ref.current;
    if (!box) return;
    const sized = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    );
    sized.observe(box);
    return () => sized.disconnect();
  }, []);
  return [ref, size] as const;
}

/** The same numbers every render, for motion that is not random on the server and again in the browser. */
export const spread = (i: number, salt: number) => {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** A group's title, small and spaced, as the network has them. */
export const GROUP_TITLE =
  'text-[11px] leading-[16px] font-semibold tracking-[1.2px] whitespace-nowrap uppercase';
