import { InfoCircleOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './free-credits-notification.module.css';

export interface FreeCreditsNotificationProps {
  onDismiss: () => void;
  reset_in: number | null;
}

export default function FreeCreditsNotification({
  onDismiss,
  reset_in,
}: FreeCreditsNotificationProps) {
  const formatResetTime = (seconds: number | null): string => {
    if (seconds === null || seconds <= 0) {
      return 'later';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0 && minutes > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `in ${hours} hour${hours > 1 ? 's' : ''}`;
    }
    if (minutes > 0) {
      return `in ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return 'in less than a minute';
  };

  return (
    <div className={styles.notification}>
      <div className={styles.icon}>
        <InfoCircleOutlined />
      </div>
      <div className={styles.content}>
        <h4 className={styles.title}>Free Credits Exhausted</h4>
        <p className={styles.message}>
          You have used all of your free credits. Your next chats will be charged from the current
          project's balance. Free credits will be replenished {formatResetTime(reset_in)}.
        </p>
      </div>
      <button
        type="button"
        className={styles.closeButton}
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <CloseOutlined />
      </button>
    </div>
  );
}
