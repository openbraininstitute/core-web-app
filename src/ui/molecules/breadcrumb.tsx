import { RightOutlined } from '@ant-design/icons';

import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

export const ToneDict = {
  Inactive: 'inactive',
  Active: 'active',
} as const;

export type BreadcrumbTone = (typeof ToneDict)[keyof typeof ToneDict];

export default function Breadcrumb({
  children,
  cls,
  showChevron = true,
  variant = ViewVariant.Light,
  tone = ToneDict.Inactive,
}: {
  children?: ReactNode;
  showChevron?: boolean;
  variant?: TViewVariant;
  tone?: BreadcrumbTone;
  cls?: {
    label?: string;
    icon?: string;
  };
}) {
  const textClass =
    variant === ViewVariant.Default
      ? cn('text-[#adcdf2]', { 'font-bold': tone === ToneDict.Active })
      : cn('text-primary-9', { 'font-bold': tone === ToneDict.Active });

  const separatorClass = variant === ViewVariant.Default ? 'text-[#adcdf2]' : 'text-primary-9';

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
