import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function DataLayout({ children }: Props) {
  return (
    <div
      id="data-layout"
      data-testid="data-layout"
      className="bg-background grid h-full w-full grid-cols-[27rem_1fr] grid-rows-[1fr] overflow-hidden [grid-template-areas:'main_main'] pr-1 max-md:grid-cols-[minmax(0,1fr)] max-md:pr-0"
    >
      {children}
    </div>
  );
}
