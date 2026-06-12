import { cn } from '@/utils/css-class';

import type { ReactNode } from 'react';

import styles from './side-menu-action.module.css';

export default function Action({
  children,
  icon,
  onClick,
}: {
  children: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button className={cn(styles.sideMenuAction, 'w-full gap-3')} onClick={onClick} type="button">
      <div className="min-w-max">{children}</div>
      <div
        className={cn(
          'hover:text-primary-7! hover:shadow-bnb flex size-10! min-h-10! min-w-10!',
          'ml-auto items-center justify-center rounded-full border border-gray-400'
        )}
      >
        {icon}
      </div>
    </button>
  );
}
