import { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="ml-5 h-full rounded-md border-[1px] border-[#D9D9D9] px-5 py-3">{children}</div>
  );
}
