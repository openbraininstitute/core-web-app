import { RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { cn } from '@/utils/css-class';

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
          <RightOutlined className="text-xs" />
        </div>
      )}
    </div>
  );
}
