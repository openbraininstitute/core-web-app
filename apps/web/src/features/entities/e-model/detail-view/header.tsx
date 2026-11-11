import { type TViewVariant, ViewVariant } from '@/constants';
import { detailViewHeadingClass } from '@/ui/segments/detail-view/variant-styles';

import type { ReactNode } from 'react';

export function Header({
  children,
  variant = ViewVariant.Light,
}: {
  children: ReactNode;
  variant?: TViewVariant;
}) {
  return <div className={detailViewHeadingClass(variant, '2xl')}>{children}</div>;
}
