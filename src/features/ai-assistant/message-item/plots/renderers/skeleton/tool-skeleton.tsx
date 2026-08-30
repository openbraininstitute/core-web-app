import styles from './tool-skeleton.module.css';

export default function ToolSkeleton() {
  return <div className={styles.skeleton} />;
}

export function ToolSkeletonStandalone({ isStreaming }: { isStreaming?: boolean }) {
  const inner = (
    <div className={styles.standaloneWrapper}>
      <ToolSkeleton />
    </div>
  );

  if (isStreaming) {
    return <div className={styles.standaloneStreamingOuter}>{inner}</div>;
  }

  return inner;
}
