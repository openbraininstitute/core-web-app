import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function NotebookLayout({ children }: Props) {
  return (
    <div
      id="explore-layout"
      className="bg-neutral-1 h-full max-h-[calc(100vh-6rem)] w-full overflow-hidden"
    >
      {children}
    </div>
  );
}
