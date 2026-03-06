import { RiBook2Fill } from '@remixicon/react';
import React from 'react';

import { classNames } from '@/util/utils';

import styles from './explanation.module.css';

export interface ExplanationProps {
  className?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  hasDescription: boolean;
}

/**
 * Component implementing this Figma:
 * https://www.figma.com/design/akGPTH0WwNFDfSWSs3qAnh/OBI---UX-Summer-2025?node-id=183-8506&p=f&t=wvidSlAofObM72zC-0
 */
export function Explanation({ className, title, children, hasDescription }: ExplanationProps) {
  const [open, setOpen] = React.useState(false);

  if (open)
    return (
      <div className={classNames(className, styles.open)}>
        <header>
          <div className={styles.title}>{title}</div>
          <button type="button" onClick={() => setOpen(false)}>
            <Icon />
            <div>Close</div>
          </button>
        </header>
        <section>{children}</section>
      </div>
    );

  return (
    <div className={classNames(className, styles.close)}>
      <div className={styles.title}>{title}</div>
      {hasDescription && (
        <button type="button" onClick={() => setOpen(true)}>
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
