import IconPlus from '@/components/icons/Plus';
import { cn } from '@/utils/css-class';

import styles from './collapsed-viewer.module.css';

export interface CollapsedViewerProps {
  className?: string;
  onClick(): void;
}

export function CollapsedViewer({ className, onClick }: CollapsedViewerProps) {
  return (
    <button className={cn(className, styles.collapsedViewer)} type="button" onClick={onClick}>
      <IconPlus />
      <div>3D Visualization</div>
    </button>
  );
}
