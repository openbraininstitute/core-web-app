import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function NotebooksLayout({ children }: Props) {
  return (
    <div
      id="notebooks-layout"
      // grid grid-rows-[1fr] grid-rows-[4rem_1fr] [grid-template-areas:'header_header''main_main'] grid-cols-[27rem_1fr]
      className="bg-background h-full max-h-[calc(100vh-4rem)] w-full gap-2 overflow-hidden"
    >
      {children}
    </div>
  );
}
