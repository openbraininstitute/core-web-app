import type { ReactNode } from 'react';

export function Header({ children }: { children: ReactNode }) {
  return <div className="text-primary-8 text-2xl font-bold">{children}</div>;
}
