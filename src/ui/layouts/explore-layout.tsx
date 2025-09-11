import { cn } from '@/utils/css-class';
import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DataLayout({ children }: Props) {
  return (
    <div
      id="data-layout"
      className={cn("bg-background border mx-6 grid h-full max-h-[calc(100vh-6rem)] w-full grid-cols-[27rem_1fr] grid-rows-[4rem_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_main']",
        'gap-4 overflow-hidden border-neutral-2 rounded-2xl p-2 [grid-area:main]'
      )}
    >
      {children}
    </div>
  );
}
