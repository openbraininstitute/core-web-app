import { RightOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';
import { cn } from '@/utils/css-class';

export default function Breadcrumb({
  children,
  cls,
  showChevron = true,
  variant = 'light',
  tone = 'inactive',
}: {
  children?: ReactNode;
  showChevron?: boolean;
  variant?: 'light' | 'onPrimary';
  tone?: 'inactive' | 'active';
  cls?: {
    label?: string;
    icon?: string;
  };
}) {
  const textClass =
    variant === 'onPrimary'
      ? tone === 'active'
        ? 'text-primary-3 font-semibold'
        : 'text-primary-2'
      : cn('text-primary-8', tone === 'active' && 'font-bold');

  const separatorClass = variant === 'onPrimary' ? 'text-primary-1' : 'text-primary-8';

  return (
    <div className="align-center inline-flex items-center justify-center gap-2">
      <span className={cn(textClass, cls?.label)}>{children}</span>
      {showChevron && (
        <div className={cn(separatorClass, cls?.icon)}>
          <RightOutlined className="text-xs" />
        </div>
      )}
    </div>
  );
}
