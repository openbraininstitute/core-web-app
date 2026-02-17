import { classNames } from '@/util/utils';

import { usePointerHandler } from './pointer-handler';

import styles from './panel-splitter.module.css';

interface PanelSplitterProps {
  className?: string;
}

export default function PanelSplitter({ className }: PanelSplitterProps) {
  const handler = usePointerHandler();
  return <div className={classNames(className, styles.panelSplitter)} {...handler.props} />;
}
