import type { PropsWithChildren } from 'react';

export default function Layout({ children }: PropsWithChildren) {
  return (
    <section id="quick-access" className="pr-2">
      {children}
    </section>
  );
}
