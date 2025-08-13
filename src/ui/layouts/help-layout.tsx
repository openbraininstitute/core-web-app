import { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

export function HelpLayout({ children }: Props) {
  return (
    <div
      id="help-layout"
      className="bg-neutral-1 flex h-full max-h-[calc(100vh-6rem)] w-full flex-col overflow-hidden px-8"
    >
      {children}
    </div>
  );
}
