'use client';

import type { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function ProjectRootLayout({ children }: Props) {
  return (
    <div
      id="project-root-layout"
      className="bg-neutral-1 grid h-screen w-full grid-cols-[1fr] grid-rows-[4rem_1fr] gap-2 overflow-hidden [grid-template-areas:'header''main']"
    >
      {children}
    </div>
  );
}

export default ProjectRootLayout;
