import type { ReactNode } from 'react';

/** The fixed-height box every 3D viewer draws in; the viewers need a definite height. */
export function ViewerFrame({ children }: { readonly children: ReactNode }) {
  return (
    <div className="relative h-[440px] w-full border-t border-block-border [&>*]:rounded-t-none">
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
