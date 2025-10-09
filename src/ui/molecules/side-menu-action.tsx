import { ReactNode } from 'react';

import { cn } from '@/utils/css-class';

export default function Action({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <div>{children}</div>
      <div
        className={cn(
          'hover:text-primary-7 hover:shadow-bnb flex h-10 w-10',
          'items-center justify-center rounded-full border border-gray-400'
        )}
      >
        {icon}
      </div>
    </div>
  );
}
