import { Signal } from '../signal';

import type { UIMessage } from '@ai-sdk/react';

type SendFn = (text: string, files?: File[]) => void;
type StopFn = () => Promise<void>;

export class ChatManager {
  public readonly messages = new Signal<UIMessage[]>([]);

  public readonly status = new Signal<string>('ready');

  public readonly error = new Signal<Error | undefined>(undefined);

  private _sendMessage: SendFn = () => {};

  private _stop: StopFn = async () => {};

  readonly sendMessage: SendFn = (text: string, files?: File[]) => this._sendMessage(text, files);

  readonly stop: StopFn = async () => this._stop();

  sync({
    status,
    error,
    sendMessage,
    stop,
  }: {
    status: string;
    error: Error | undefined;
    sendMessage: SendFn;
    stop: StopFn;
  }) {
    this.status.set(status);
    this.error.set(error);
    this._sendMessage = sendMessage;
    this._stop = stop;
  }
}
