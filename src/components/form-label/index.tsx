import { ReactNode } from 'react';
import { classNames } from '@/util/utils';

export const label = (text: string, type: 'main' | 'secondary' = 'main', extra?: ReactNode) => (
  <span
    className={classNames(
      'text-base font-light uppercase',
      type === 'main' && 'text-primary-8 !font-bold',
      type === 'secondary' && 'text-neutral-3'
    )}
  >
    {text} {extra}
  </span>
);
