import {
  CheckCircleFilled,
  CloseOutlined,
  InfoCircleOutlined,
  WarningFilled,
} from '@ant-design/icons';
import { notification as antd_notification } from 'antd';
import { Key } from 'react';
import { NotificationType, Placement } from '@/types/notifications';

/**
 * Function used in order to open a notification using the antD notification API
 * Important to use this one since it modifies the styles to be more uniform
 *
 * @param type the notification type
 * @param message the message to display
 * @param duration the duration in seconds
 * @param placement where to appear in the screen
 * @param closeIcon whether to show the close icon or not
 * @param key
 */
export default function openNotification(
  type: NotificationType,
  message: string,
  duration: number = 5,
  placement: Placement = 'bottomRight',
  closeIcon: boolean = true,
  key?: Key,
  description?: string
) {
  let icon;
  let backgroundColor;

  switch (type) {
    case 'error':
      icon = <WarningFilled style={{ color: 'white' }} />;
      backgroundColor = '#F5222D';
      break;
    case 'warning':
      icon = <WarningFilled style={{ color: 'white' }} />;
      backgroundColor = '#FA8C16';
      break;
    case 'info':
      icon = <InfoCircleOutlined style={{ color: 'white' }} />;
      backgroundColor = '#003A8C';
      break;
    default:
      icon = <CheckCircleFilled style={{ color: 'white' }} />;
      backgroundColor = '#237804';
  }

  antd_notification[type]({
    message: <div className="text-neutral-1">{message}</div>,
    description: <div className="text-neutral-1">{description}</div>,
    style: { backgroundColor },
    closeIcon: closeIcon && <CloseOutlined style={{ fontSize: '1.5em', color: 'white' }} />,
    duration,
    icon,
    placement,
    key,
  });
}

/**
 * Adds an error message in the notifications queue
 * @param message
 * @param duration
 * @param placement
 */
const error = (
  message: string,
  duration: number = 5,
  placement: Placement = 'bottomRight',
  closeIcon: boolean = true,
  key?: Key,
  description?: string
) => {
  openNotification('error', message, duration, placement, closeIcon, key, description);
};

/**
 * Adds a warning message in the notifications queue
 * @param message
 * @param duration
 * @param placement
 */
const warning = (
  message: string,
  duration: number = 5,
  placement: Placement = 'bottomRight',
  closeIcon: boolean = true,
  key?: Key,
  description?: string
) => {
  openNotification('warning', message, duration, placement, closeIcon, key, description);
};

/**
 * Adds a success message in the notifications queue
 * @param message
 * @param duration
 * @param placement
 */
const success = (
  message: string,
  duration: number = 5,
  placement: Placement = 'bottomRight',
  closeIcon: boolean = true,
  key?: Key,
  description?: string
) => {
  openNotification('success', message, duration, placement, closeIcon, key, description);
};

/**
 * Adds an info message in the notifications queue
 * @param message
 * @param duration
 * @param placement
 */
const info = (
  message: string,
  duration: number = 5,
  placement: Placement = 'bottomRight',
  closeIcon: boolean = true,
  key?: Key,
  description?: string
) => {
  openNotification('info', message, duration, placement, closeIcon, key, description);
};

export const notification = { error, warning, success, info };
