import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DataLayout({ children }: Props) {
  return (
    <div
      id="data-layout"
      data-testid="data-layout"
      className="bg-background grid h-full w-full grid-cols-[27rem_1fr] grid-rows-[auto_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_main'] pr-1"
    >
      {children}
    </div>
  );
}
