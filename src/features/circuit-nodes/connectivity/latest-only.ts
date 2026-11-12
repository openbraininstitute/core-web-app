/** What a task asked for fails with, once another was asked for on its channel before it ran. */
export class SupersededError extends Error {
  constructor() {
    super('Superseded by a later request');
    this.name = 'SupersededError';
  }
}

type Channel = {
  running: (error: Error) => void;
  waiting: { start: () => void; reject: (error: Error) => void } | null;
};

/**
 * Runs a channel's tasks one at a time, and of those asked for while one runs, only the last:
 * a worker answers in turn, so each one it is spared is time the last does not wait.
 */
export class LatestOnly {
  private channels = new Map<object, Channel>();

  run<T>(channel: object, task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = () => {
        const state: Channel = { running: reject, waiting: null };
        this.channels.set(channel, state);
        new Promise<T>((done) => done(task())).then(resolve, reject).finally(() => {
          // Let go of meanwhile: what waited then was failed there.
          if (this.channels.get(channel) !== state) return;
          if (state.waiting) state.waiting.start();
          else this.channels.delete(channel);
        });
      };
      const state = this.channels.get(channel);
      if (!state) {
        start();
        return;
      }
      state.waiting?.reject(new SupersededError());
      state.waiting = { start, reject };
    });
  }

  /** Fails every task with `error`, running or waiting: one whose worker is gone never ends. */
  reset(error: Error): void {
    const channels = [...this.channels.values()];
    this.channels.clear();
    for (const { running, waiting } of channels) {
      running(error);
      waiting?.reject(error);
    }
  }
}
