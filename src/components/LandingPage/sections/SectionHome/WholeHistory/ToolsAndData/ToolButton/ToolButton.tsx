import React from 'react';

import { classNames } from '@/util/utils';
import { IconArrowRight } from '@/components/LandingPage/icons/IconArrowRight';

import styles from './ToolButton.module.css';

export interface ToolButtonProps {
  className?: string;
  /**
   * Use "|" to separate the first and second line.
   * @example
   * <ToolButton label="View on|Github" />
   */
  label: string;
}

export default function ToolButton({ className, label }: ToolButtonProps) {
  const [firstLine, secondLine] = label.split('|');
  return (
    <button className={classNames(className, styles.toolButton)} type="button">
      <div>
        <div>{firstLine}</div>
        <div>
          <IconArrowRight />
        </div>
      </div>
      <h2>{secondLine}</h2>
    </button>
  );
}
