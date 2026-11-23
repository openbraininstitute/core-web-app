import type { ILogEntry } from '@/features/task-logs-stream/types';

// `[t=450.00] Completed 45% ETA: 0:00:12`, from neurodamus running NEURON and from obi-one's
// Brian2 runner. On a cluster each line also carries an MPI rank's tag, before or after it.
const COMPLETED = /\[t=\s*\d+(?:\.\d+)?\]\s+Completed\s+(\d+)%/;
// `psolve |=====      | t: 50.00  ETA: 0h00m05s`, from CoreNEURON: the bar fills as steps are taken.
const PSOLVE = /psolve\s*\|([= ]+)\|\s*t:/;

/**
 * The percentage of its run a simulation last reported in its task log, or null before it
 * starts stepping. Read from the end back, so a log that is still streaming costs little once
 * progress lines arrive.
 */
export function steppedPercent(entries: ILogEntry[]): number | null {
  for (let i = entries.length - 1; i >= 0; i -= 1) {
    const { message } = entries[i];
    if (message.includes('Completed')) {
      const completed = COMPLETED.exec(message);
      if (completed) return Math.min(100, Number(completed[1]));
    }
    if (message.includes('psolve')) {
      const bar = PSOLVE.exec(message);
      if (bar) {
        const filled = bar[1].replaceAll(' ', '').length;
        return Math.round((100 * filled) / bar[1].length);
      }
    }
  }
  return null;
}
