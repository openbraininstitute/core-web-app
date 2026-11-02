import Link from 'next/link';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** The tag above a stage's title: a light blue dot and what is on show. */
export function StageTag({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-[7px]">
      <img src="/images/start/tag-dot.svg" alt="" width={9} height={9} />
      <p className="text-[12px] leading-[16px] font-semibold tracking-[0.3px] text-white">
        {children}
      </p>
    </div>
  );
}

export function StageTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[40px] leading-[47px] font-bold text-white">{children}</h2>;
}

/** A 3D view's title and what it is, in navy under the view, with what can be done with it on the right. */
export function StageCaption({
  title,
  details,
  children,
}: {
  title: string;
  details: string;
  children?: ReactNode;
}) {
  return (
    <div className="text-primary-9 flex shrink-0 items-center justify-between gap-6">
      <div className="flex min-w-0 flex-col gap-[2px]">
        <h2 className="truncate text-[22px] leading-[28px] font-bold">{title}</h2>
        <p className="truncate text-[13px] leading-[17px]">{details}</p>
      </div>
      {children && <div className="flex shrink-0 gap-[8px]">{children}</div>}
    </div>
  );
}

const actionClassName =
  'flex items-center gap-[10px] rounded-[23px] border px-[20px] pt-[12px] pb-[13px] text-[14px] leading-[19px] font-semibold transition-opacity';

/** A pill under a 3D view: outlined, or navy for the main action. Without `href`, greyed with `title` saying why. */
export function StageAction({
  href,
  primary = false,
  title,
  children,
}: {
  href: string | null;
  primary?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const look = primary
    ? 'border-primary-9 bg-primary-9 text-white'
    : 'border-neutral-2 bg-white text-primary-9';
  if (!href) {
    return (
      <span className={cn(actionClassName, look, 'cursor-not-allowed opacity-40')} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cn(actionClassName, look, 'hover:opacity-90')} title={title}>
      {children}
    </Link>
  );
}

/** The white frame a 3D view is drawn in. */
export const STAGE_VIEW_CLASS =
  'text-primary-9 relative min-h-0 flex-1 overflow-hidden rounded-[12px] border border-[#f0f0f0] bg-white [&:fullscreen]:rounded-none';
