import { ReactNode } from 'react';

export default function Action({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>{children}</div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-400">
        {icon}
      </div>
    </div>
  );
}
