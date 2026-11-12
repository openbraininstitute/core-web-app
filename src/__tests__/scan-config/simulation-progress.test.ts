import { describe, expect, it } from 'vitest';

import { steppedPercent } from '@/features/task-logs-stream/simulation-progress';

import type { ILogEntry } from '@/features/task-logs-stream/types';

const log = (...messages: string[]): ILogEntry[] =>
  messages.map((message, i) => ({
    id: String(i),
    type: 'stdout',
    message,
    timestampGroupLabel: null,
  }));

// Lines as staging's task logs carry them.
const neuronInit = [
  '[1,0]<stdout>: [STEP] ==================== BUILDING CIRCUIT ====================',
  'Loading|[1,0]<stdout>: -[1,0]<stdout>: --[1,0]<stdout>: 20[1,0]<stdout>: %-[1,0]<stdout>: --',
  '[1,0]<stdout>: [INFO] Running simulation until t=300 ms',
  '[1,0]<stdout>:',
];

describe('steppedPercent', () => {
  it('has nothing to report before the simulator steps', () => {
    expect(steppedPercent(log(...neuronInit))).toBeNull();
    expect(steppedPercent(log('[PHASE] Clone repository completed in 0.76s'))).toBeNull();
    expect(steppedPercent([])).toBeNull();
  });

  it('reads neurodamus on NEURON, tagged by its MPI rank on a cluster', () => {
    expect(
      steppedPercent(
        log(
          ...neuronInit,
          '[t= 1.00] Completed  0% ETA: 0:12:14  [1,0]<stdout>:',
          '[t=45.00] Completed 15% ETA: 0:10:32  [1,0]<stdout>:'
        )
      )
    ).toBe(15);
  });

  it('keeps the last report through what follows the run', () => {
    expect(
      steppedPercent(
        log(
          '[t=299.00] Completed 100% ETA: 0:00:02  [1,0]<stdout>:',
          '[t=300.00] Completed 100% ETA: 0:00:00  [1,0]<stdout>: [INFO] Simulation finished.',
          '[1,0]<stdout>: [INFO] Clearing model',
          'Registering result and uploading 2 assets'
        )
      )
    ).toBe(100);
  });

  it("reads obi-one's Brian2 runner", () => {
    expect(
      steppedPercent(
        log(
          '[INFO] Running simulation',
          '[t=60.35] Completed  6% ETA: 0:00:31',
          '[t=464.95] Completed 46% ETA: 0:00:18'
        )
      )
    ).toBe(46);
  });

  it("reads CoreNEURON's bar by how full it is", () => {
    const bar = (filled: number, t: string) =>
      `[1,0]<stdout>: psolve |${'='.repeat(filled)}${' '.repeat(57 - filled)}| t: ${t}  ETA: 0h04m21s`;
    expect(steppedPercent(log(bar(0, '0.00')))).toBe(0);
    expect(steppedPercent(log(bar(0, '0.00'), bar(5, '10.00')))).toBe(9);
    expect(steppedPercent(log(bar(57, '100.00'), '[1,0]<stdout>: Solver Time : 251.459'))).toBe(
      100
    );
  });
});
