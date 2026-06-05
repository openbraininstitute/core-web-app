import { RiBook2Fill } from '@remixicon/react';
import React from 'react';

import { type TViewVariant, ViewVariant } from '@/constants';
import { cn } from '@/utils/css-class';

import styles from './explanation.module.css';

export interface ExplanationProps {
  className?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  hasDescription: boolean;
  variant?: TViewVariant;
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
  variant = ViewVariant.Light,
}: ExplanationProps) {
  const [open, setOpen] = React.useState(false);
  const isPrimary = variant === ViewVariant.Default;

  if (open)
    return (
      <div className={cn(className, styles.open, { 'text-white': isPrimary })}>
        <header>
          <div className={cn(styles.title, { 'text-white': isPrimary })}>{title}</div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className={cn({ 'border-white/30 text-white': isPrimary })}
          >
            <Icon />
            <div>Close</div>
          </button>
        </header>
        <section>{children}</section>
      </div>
    );

  return (
    <div className={cn(className, styles.close, { 'text-white': isPrimary })}>
      <div className={cn(styles.title, { 'text-white': isPrimary })}>{title}</div>
      {hasDescription && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn({ 'border-white/30 text-white': isPrimary })}
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
