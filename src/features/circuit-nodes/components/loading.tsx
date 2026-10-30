import { Progress, Spin } from 'antd';

import { formatBytes } from '@/utils/format';

import type { DownloadProgress as Progressed } from '@/features/circuit-nodes/types';

import styles from '@/features/circuit-nodes/circuit-nodes-table.module.css';

export function CenteredSpin({ label }: { label: string }) {
  return (
    <div className={styles.centered}>
      <Spin tip={label} size="large" className="[&_.ant-spin-dot-item]:bg-primary-6!">
        <div className={styles.spinBox} />
      </Spin>
    </div>
  );
}

/** A file on its way: a bar where its size is known, else a spinner and what has come. */
export function DownloadProgress({
  progress,
  what,
}: {
  progress: Progressed | null;
  /** What is downloading, such as "nodes". */
  what: string;
}) {
  // No bytes yet (or no Content-Length to compute a percent): fall back to the indeterminate spinner.
  if (!progress) return <CenteredSpin label={`Loading ${what}…`} />;
  if (!progress.total) {
    return <CenteredSpin label={`Downloading ${what}… ${formatBytes(progress.received, 0)}`} />;
  }

  const percent = Math.round((progress.received / progress.total) * 100);
  return (
    <div className={styles.centered}>
      <div style={{ width: 280 }} className="text-center">
        <div className="mb-1 text-sm text-primary-9">
          Downloading {what}…{' '}
          <span className="tabular-nums">
            {formatBytes(progress.received, 0)} / {formatBytes(progress.total, 0)}
          </span>
        </div>
        <Progress
          type="line"
          percent={percent}
          strokeColor="var(--color-primary-6)"
          className="[&_.ant-progress-text]:text-primary-9!"
        />
      </div>
    </div>
  );
}
