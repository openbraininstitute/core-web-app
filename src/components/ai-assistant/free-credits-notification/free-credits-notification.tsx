import { InfoCircleOutlined, CloseOutlined } from "@ant-design/icons";
import { useMemo } from "react";
import styles from "./free-credits-notification.module.css";

export interface FreeCreditsNotificationProps {
  onDismiss: () => void;
  resetIn: number | null;
}

export default function FreeCreditsNotification({
  onDismiss,
  resetIn,
}: FreeCreditsNotificationProps) {
  // Freeze the reset time when component mounts
  const resetTimeString = useMemo(() => {
    if (resetIn === null || resetIn <= 0) {
      return "later";
    }

    // Calculate the reset time in user's local timezone
    const resetDate = new Date(Date.now() + resetIn * 1000);

    // Format the time in user's local timezone
    const timeString = resetDate.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Check if reset is today or tomorrow
    const isToday = new Date().getDate() === resetDate.getDate();

    if (isToday) {
      return `at ${timeString}`;
    }

    return `tomorrow at ${timeString}`;
  }, [resetIn]);

  return (
    <div className={styles.notification}>
      <div className={styles.icon}>
        <InfoCircleOutlined />
      </div>
      <div className={styles.content}>
        <h4 className={styles.title}>Free Credits Exhausted</h4>
        <p className={styles.message}>
          You have used all of your free credits. Your next chats will be
          charged from the current project's balance. Free credits will be
          replenished {resetTimeString}.
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
