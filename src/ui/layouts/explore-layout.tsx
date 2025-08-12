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

export function ExploreInnerLayout({ children }: Props) {
  return (
    <div
      id="explore-inner-layout"
      className="bg-neutral-1 border-neutral-2 mx-2 mb-2 grid h-full max-h-[calc(100vh-8rem)] w-[calc(100%-10px)] grid-cols-[27rem_1fr] gap-4 overflow-hidden rounded-2xl border p-2 [grid-area:main] [grid-template-areas:'aside_body']"
    >
      {children}
    </div>
  );
}
