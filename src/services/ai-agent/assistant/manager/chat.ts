import { Signal } from '../signal';

import type { CreateMessage, Message } from '@ai-sdk/react';
import type { ChatRequestOptions } from '@ai-sdk/ui-utils';

type AppendFn = (message: Message | CreateMessage, options?: ChatRequestOptions) => void;
type StopFn = () => Promise<void>;

export class ChatManager {
  public readonly messages = new Signal<Message[]>([]);

  public readonly status = new Signal<string>('ready');

  public readonly error = new Signal<Error | undefined>(undefined);

  private _append: AppendFn = () => {};

  private _stop: StopFn = async () => {};

  readonly append: AppendFn = (message, options) => this._append(message, options);

  readonly stop: StopFn = async () => this._stop();

  sync({
    status,
    error,
    append,
    stop,
  }: {
    status: string;
    error: Error | undefined;
    append: AppendFn;
    stop: StopFn;
  }) {
    this.status.set(status);
    this.error.set(error);
    this._append = append;
    this._stop = stop;
  }
}
