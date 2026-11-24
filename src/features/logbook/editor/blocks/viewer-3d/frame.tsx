import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

/** The fixed-height box every 3D viewer draws in; the viewers need a definite height. */
export function ViewerFrame({
  children,
  className,
}: {
  readonly children: ReactNode;
  /** A viewer's own height or background, over the default 440px box. */
  readonly className?: string;
}) {
  return (
    <div
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
