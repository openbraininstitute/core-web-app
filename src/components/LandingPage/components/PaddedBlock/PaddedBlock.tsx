import React from 'react';

import { styleLayout } from '../../styles';
import { classNames } from '@/util/utils';

export interface PaddedBlockProps {
  className?: string;
  children: React.ReactNode;
}

export default function PaddedBlock({ className, children }: PaddedBlockProps) {
  return <div className={classNames(className, styleLayout)}>{children}</div>;
}
