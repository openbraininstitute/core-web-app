import styles from './tab-transition-loader.module.css';

interface TabTransitionLoaderProps {
  message?: string;
}

export default function TabTransitionLoader({ message = 'Loading...' }: TabTransitionLoaderProps) {
  return (
    <div className={styles.tabTransitionLoader}>
      <div className={styles.spinner} />
      <div className={styles.text}>{message}</div>
    </div>
  );
}
