import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function NotebooksLayout({ children }: Props) {
  return (
    <div
      id="notebooks-layout"
      className="bg-background border-neutral-2 ml-5 h-[calc(100vh-7rem)] rounded-2xl border p-5"
    >
      {children}
    </div>
  );
}
