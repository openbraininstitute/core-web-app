import { InfoCircleOutlined, CloseOutlined } from '@ant-design/icons';
import styles from './free-credits-notification.module.css';

export interface FreeCreditsNotificationProps {
  onDismiss: () => void;
}

export default function FreeCreditsNotification({ onDismiss }: FreeCreditsNotificationProps) {
  return (
    <div className={styles.notification}>
      <div className={styles.icon}>
        <InfoCircleOutlined />
      </div>
      <div className={styles.content}>
        <h4 className={styles.title}>Free Credits Exhausted</h4>
        <p className={styles.message}>
          You have used all of your free credits. Your next chats will be charged from the current project's balance. Free credits will be replenished later.
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
