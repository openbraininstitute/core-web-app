import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Action({
  children,
  icon,
  variant = 'light',
}: {
  children: ReactNode;
  icon: ReactNode;
  variant?: 'light' | 'onPrimary';
}) {
  return (
    <div className="flex w-full cursor-pointer items-center justify-between gap-3">
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'ml-auto flex size-10! min-h-10! min-w-10! items-center justify-center rounded-full border',
          variant === 'onPrimary'
            ? 'border-white/40 hover:bg-white/10 hover:text-white'
            : 'hover:text-primary-7! hover:shadow-bnb border-gray-400'
        )}
      >
        {icon}
      </div>
    </div>
  );
}
