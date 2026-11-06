interface ReportTask {
  message: string;
  failure: boolean;
}

/**
 * Log all actions done while reading a circuit's edge files.
 * It helps having a detailed diagnostic in case of failure.
 */
export class Report {
  private readonly tasks: ReportTask[] = [];

  /** Whether the log is for someone: the debug flag is on. */
  constructor(readonly debugging: boolean) {}

  logTask(message: string): this {
    this.tasks.push({ message, failure: false });
    return this;
  }

  logFailure(error: unknown): this {
    this.tasks.push({ message: resolveMessage(error), failure: true });
    return this;
  }

  /** Dump the log, for whoever switched the debug flag on. */
  debug() {
    if (!this.debugging) return;

    const { tasks } = this;
    const text = tasks.map((task) => `%c${task.message}`).join('\n');
    const styles = tasks.map((task) =>
      task.failure ? 'background:#000;color:#f66' : 'background:#000;color:#9cd'
    );
    // biome-ignore lint/suspicious/noConsole: dumping to the console is what this method is for, and it only runs behind the debug flag
    console.debug(text, ...styles);
  }
}

function resolveMessage(error: unknown): string {
  if (typeof error === 'string') return error;

  if (error instanceof Error) return error.message;

  return JSON.stringify(error);
}
