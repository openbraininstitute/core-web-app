import styles from './tool-skeleton.module.css';

export default function ToolSkeleton() {
  return <div className={styles.skeleton} />;
}

export function ToolSkeletonStandalone() {
  return (
    <div className={styles.standaloneWrapper}>
      <ToolSkeleton />
    </div>
  );
}
