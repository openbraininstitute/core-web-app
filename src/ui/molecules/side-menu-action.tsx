import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

import styles from './side-menu-action.module.css';

export default function Action({
  children,
  icon,
  onClick,
  variant = 'light',
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  variant?: 'light' | 'onPrimary';
}) {
  return (
    <button className={cn(styles.sideMenuAction, 'w-full gap-3')} onClick={onClick} type="button">
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'ml-auto flex size-10! min-h-10! min-w-10! items-center justify-center rounded-full border',
          variant === 'onPrimary'
            ? 'border-white/40 hover:bg-white/10 hover:text-white'
            : 'hover:text-primary-7! hover:shadow-bnb border-gray-400'
        )}
      >
        {icon}
      </div>
    </button>
  );
}
