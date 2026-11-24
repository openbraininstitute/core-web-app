import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** The fixed-height box every 3D viewer draws in; page text styles stop at it. */
export function ViewerFrame({
  children,
  className,
}: {
  readonly children: ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      data-logbook-foreign
      className={cn(
        'relative h-[440px] w-full border-t border-block-border select-none [&>*]:rounded-t-none',
        className
      )}
    >
      {children}
    </div>
  );
}

export function ViewerMessage({ text }: { readonly text: string }) {
  return (
    <ViewerFrame>
      <p className="m-0 grid h-full place-items-center text-[13px] text-neutral-4">{text}</p>
    </ViewerFrame>
  );
}
