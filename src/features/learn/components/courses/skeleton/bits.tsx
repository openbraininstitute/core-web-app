/**
 * The small pieces the skeleton figure's panels are set in, as the entitysdk course's are: notes in
 * an italic serif, names from the code in mono, and quiet cards that follow the page's theme.
 */

import { SERIF } from '@/features/learn/components/heuristics/shared';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** A quiet remark, in the courses' italic serif. */
export function Note({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn('text-[12.5px] leading-snug text-slate-400 italic', className)}
      style={{ fontFamily: SERIF }}
    >
      {children}
    </span>
  );
}

/** A name from the code or the files: a class, a field, a column, a path. */
export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cn('font-mono text-[0.92em] text-sky-400', className)}>{children}</code>;
}

/** A card on the page, light on the platform's theme and dark on the dark one. */
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-slate-800 bg-slate-900/40 px-4 py-3', className)}>
      {children}
    </div>
  );
}

/** Where a thing lives or comes from, as a small tag. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-block rounded-full border border-slate-700 px-2 py-px text-[10.5px] tracking-wide text-slate-400 uppercase',
        className
      )}
    >
      {children}
    </span>
  );
}
