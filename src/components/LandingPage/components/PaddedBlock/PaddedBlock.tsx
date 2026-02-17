import { classNames } from '@/util/utils';

import { styleLayout } from '../../styles';

import type React from 'react';

interface PaddedBlockProps {
  className?: string;
  children: React.ReactNode;
}

export default function PaddedBlock({ className, children }: PaddedBlockProps) {
  return <div className={classNames(className, styleLayout)}>{children}</div>;
}
