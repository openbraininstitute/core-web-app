import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ExploreLayout({ children }: Props) {
  return (
    <div
      id="explore-layout"
      className="bg-neutral-1 grid h-full max-h-[calc(100vh-6rem)] w-full grid-cols-[27rem_1fr] grid-rows-[4rem_1fr] gap-2 overflow-hidden [grid-template-areas:'header_header''main_main']"
    >
      {children}
    </div>
  );
}
