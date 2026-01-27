import { classNames } from '@/util/utils';
import styles from './panel-splitter.module.css';
import { usePointerHandler } from './pointer-handler';

interface PanelSplitterProps {
  className?: string;
}

export default function PanelSplitter({ className }: PanelSplitterProps) {
  const handler = usePointerHandler();
  return <div className={classNames(className, styles.panelSplitter)} {...handler.props} />;
}
