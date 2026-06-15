import { RiArrowRightSLine } from '@remixicon/react';

import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export default function Breadcrumb({
  children,
  cls,
  showChevron = true,
}: {
  children?: ReactNode;
  showChevron?: boolean;
  cls?: {
    label?: string;
    icon?: string;
  };
}) {
  return (
    <div className="align-center inline-flex justify-center gap-2">
      <span className={cn('text-primary-8', cls?.label)}>{children}</span>
      {showChevron && (
        <div className={cn('text-primary-8', cls?.icon)}>
          <RiArrowRightSLine className="size-3" />
        </div>
      )}
    </div>
  );
}
