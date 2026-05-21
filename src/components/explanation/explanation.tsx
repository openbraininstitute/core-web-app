import { RiBook2Fill } from '@remixicon/react';
import React from 'react';

import type { DetailViewVariant } from '@/ui/segments/detail-view/variant-styles';
import { cn } from '@/utils/css-class';
import { classNames } from '@/util/utils';

import styles from './explanation.module.css';

export interface ExplanationProps {
  className?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  hasDescription: boolean;
  variant?: DetailViewVariant;
}

/**
 * Component implementing this Figma:
 * https://www.figma.com/design/akGPTH0WwNFDfSWSs3qAnh/OBI---UX-Summer-2025?node-id=183-8506&p=f&t=wvidSlAofObM72zC-0
 */
export function Explanation({
  className,
  title,
  children,
  hasDescription,
  variant = 'light',
}: ExplanationProps) {
  const [open, setOpen] = React.useState(false);
  const onPrimary = variant === 'onPrimary';

  if (open)
    return (
      <div className={classNames(className, styles.open, onPrimary && styles.openOnPrimary)}>
        <header>
          <div className={cn(styles.title, onPrimary && styles.titleOnPrimary)}>{title}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={onPrimary ? 'border-white/30 text-white' : undefined}
          >
            <Icon />
            <div>Close</div>
          </button>
        </header>
        <section>{children}</section>
      </div>
    );

  return (
    <div className={classNames(className, styles.close, onPrimary && styles.closeOnPrimary)}>
      <div className={cn(styles.title, onPrimary && styles.titleOnPrimary)}>{title}</div>
      {hasDescription && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={onPrimary ? 'border-white/30 text-white' : undefined}
        >
          <Icon />
          <div>Read description</div>
        </button>
      )}
    </div>
  );
}

function Icon() {
  return <RiBook2Fill size={16} />;
}
