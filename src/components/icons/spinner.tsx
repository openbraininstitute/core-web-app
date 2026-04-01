import { cn } from '@/utils/css-class';

import type { CSSProperties } from 'react';

import styles from './icon.module.css';

type Props = {
  className?: string;
  size?: string;
  style?: CSSProperties;
};

export function IconSpinner({ className, style, size }: Props) {
  return (
    <svg
      className={cn(className, styles.icon, styles.spin)}
      style={{
        '--custom-icon-size': size ?? '1.5em',
        ...style,
      }}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>spinner</title>
      <path d="M12,4V2A10,10 0 0,0 2,12H4A8,8 0 0,1 12,4Z" />
    </svg>
  );
}
