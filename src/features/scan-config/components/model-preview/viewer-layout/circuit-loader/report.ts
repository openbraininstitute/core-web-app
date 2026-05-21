import GenericEvent from '@/util/generic-event';

export interface ReportTask {
  message: string;
  failure: boolean;
}

/**
 * Log all actions done while parsing the SONATA circuit.
 * It helps having a detailed disgnostic in case of failure.
 */
export class Report {
  private readonly eventError = new GenericEvent<boolean>();

  private readonly _tasks: ReportTask[] = [];

  private _hasError = false;

  get tasks(): Readonly<ReportTask[]> {
    return this._tasks;
  }

  clear() {
    this._tasks.splice(0);
  }

  logTask(message: string): this {
    this._tasks.push({ message, failure: false });
    return this;
  }

  logFailure(error: unknown): this {
    const message = resolveMessage(error);
    this._tasks.push({ message, failure: true });
    this.hasError = true;
    return this;
  }

  useError() {
    return this.eventError.useValue(this.hasError);
  }

  get hasError(): boolean {
    return this._hasError;
  }
  set hasError(hasError: boolean) {
    if (this._hasError === hasError) return;

    this._hasError = hasError;
    this.eventError.dispatch(hasError);
  }

  debug() {
    const { tasks } = this;
    const text = tasks.map((task) => `%c${task.message}`).join('\n');
    const styles = tasks.map((task) =>
      task.failure ? 'background:#000;color:#f66' : 'background:#000;color:#9cd'
    );
    console.debug(text, ...styles);
  }
}

function resolveMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  return JSON.stringify(error);
}
