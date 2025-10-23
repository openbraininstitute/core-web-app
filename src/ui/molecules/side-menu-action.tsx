import { ReactNode } from 'react';

import { cn } from '@/utils/css-class';

export default function Action({ children, icon }: { children: ReactNode; icon: ReactNode }) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'hover:text-primary-7 hover:shadow-bnb flex size-10! min-h-10! min-w-10!',
          'ml-auto items-center justify-center rounded-full border border-gray-400'
        )}
      >
        {icon}
      </div>
    </div>
  );
}
