import type { ReactNode } from 'react';

import {
  detailViewHeadingClass,
  type DetailViewVariant,
} from '@/ui/segments/detail-view/variant-styles';

export function Header({
  children,
  variant = 'light',
}: {
  children: ReactNode;
  variant?: DetailViewVariant;
}) {
  return <div className={detailViewHeadingClass(variant, '2xl')}>{children}</div>;
}
