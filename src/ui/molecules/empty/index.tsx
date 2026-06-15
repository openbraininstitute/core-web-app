import { RiInboxLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { ComponentProps, ReactNode } from 'react';

type EmptyProps = ComponentProps<'div'> & {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
};

function Empty({
  className,
  icon,
  title = 'Nothing here yet',
  description,
  action,
  ...props
}: EmptyProps) {
  return (
    <div
      data-slot="empty"
      role="status"
      aria-live="polite"
      className={cn('flex flex-col items-center justify-center gap-3 py-10 text-center', className)}
      {...props}
    >
      <div data-slot="empty-icon" className="text-neutral-3 [&>svg]:size-10">
        {icon ?? <RiInboxLine />}
      </div>
      <div data-slot="empty-title" className="text-neutral-5 text-sm font-semibold">
        {title}
      </div>
      {description && (
        <div data-slot="empty-description" className="text-neutral-4 max-w-sm text-xs">
          {description}
        </div>
      )}
      {action && (
        <div data-slot="empty-action" className="mt-2">
          {action}
        </div>
      )}
    </div>
  );
}

export { Empty };
