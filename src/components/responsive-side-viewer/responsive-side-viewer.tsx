import { cn } from '@/utils/css-class';

import styles from './responsive-side-viewer.module.css';

export interface ResponsiveSideViewerProps {
  className?: string;
  children: [content: React.ReactNode, viewer: React.ReactNode];
}

export function ResponsiveSideViewer({ className, children }: ResponsiveSideViewerProps) {
  const [content, viewer] = children;

  return (
    <div className={cn(className, styles.responsiveSideViewer)}>
      <div className={styles.layout}>
        <div className={styles.content}>{content}</div>
        <div className={styles.viewer}>{viewer}</div>
      </div>
    </div>
  );
}
