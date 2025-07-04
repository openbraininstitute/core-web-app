import { App } from 'antd';

export function useAppNotification() {
  const { notification } = App.useApp();
  return notification;
}

function useAppMessage() {
  const { message } = App.useApp();

  return message;
}

function useAppModal() {
  const { modal } = App.useApp();

  return modal;
}
