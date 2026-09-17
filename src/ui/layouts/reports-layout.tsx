import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ReportsLayout({ children }: Props) {
  return (
    <div
      id="reports-layout"
      className="bg-neutral-1 h-full max-h-[calc(100vh-6rem)] w-full gap-2 overflow-hidden [grid-template-areas:'header_header''main_main']"
    >
      {children}
    </div>
  );
}
