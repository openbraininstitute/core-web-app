import { classNames } from '@/util/utils';

import styles from './warning.module.css';

export interface WarningProps {
  className?: string;
  visible: boolean;
}

export default function Warning({ className, visible }: WarningProps) {
  return (
    <div className={classNames(styles.main, className, visible ? styles.show : styles.hide)}>
      Hold <em>Ctrl</em> + <em>scroll</em> to zoom
    </div>
  );
}
