import { App } from 'antd';

export function useAppNotification() {
  const { notification } = App.useApp();
  return notification;
}

export function useAppMessage() {
  const { message } = App.useApp();

  return message;
}

export function useAppModal() {
  const { modal } = App.useApp();

  return modal;
}
