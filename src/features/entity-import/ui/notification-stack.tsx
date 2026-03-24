'use client';

import { Alert, AlertContent, AlertDescription, AlertTitle } from '@/ui/molecules/alert';

import type { ImportSessionState } from '../core/contracts';

interface NotificationStackProps {
  notifications: ImportSessionState['notifications'];
  onDismiss: (notificationId: string) => void;
}

export function NotificationStack({ notifications, onDismiss }: NotificationStackProps) {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {notifications.map((notification) => (
        <Alert
          key={notification.id}
          appearance="light"
          close
          onClose={() => onDismiss(notification.id)}
          variant={
            notification.tone === 'error'
              ? 'destructive'
              : notification.tone === 'warning'
                ? 'warning'
                : notification.tone === 'success'
                  ? 'success'
                  : 'info'
          }
        >
          <AlertContent>
            <AlertTitle className="capitalize">{notification.tone}</AlertTitle>
            <AlertDescription>{notification.message}</AlertDescription>
          </AlertContent>
        </Alert>
      ))}
    </div>
  );
}
