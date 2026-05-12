import { Signal } from '../signal';

import type { UIMessage } from '@ai-sdk/react';

type sendFn = (text: string) => void;
type StopFn = () => Promise<void>;

export class ChatManager {
  public readonly messages = new Signal<UIMessage[]>([]);

  public readonly status = new Signal<string>('ready');

  public readonly error = new Signal<Error | undefined>(undefined);

  private _sendMessage: sendFn = () => {};

  private _stop: StopFn = async () => {};

  readonly sendMessage: sendFn = (text: string) => this._sendMessage(text);

  readonly stop: StopFn = async () => this._stop();

  sync({
    status,
    error,
    sendMessage,
    stop,
  }: {
    status: string;
    error: Error | undefined;
    sendMessage: sendFn;
    stop: StopFn;
  }) {
    this.status.set(status);
    this.error.set(error);
    this._sendMessage = sendMessage;
    this._stop = stop;
  }
}
